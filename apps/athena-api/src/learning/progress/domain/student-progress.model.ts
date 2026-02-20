import { GradingStatus, ProgressStatus, StudentCourseProgress, StudentLessonProgress } from "@athena/types";
import { BadRequestException } from "@nestjs/common";
import { AggregateRoot } from "@nestjs/cqrs";

import { BlockCompletedEvent } from "./events/block-completed.event";
import { CourseCompletedEvent } from "./events/course-completed.event";
import { LessonCompletedEvent } from "./events/lesson-completed.event";
import { ProgressInitializedEvent } from "./events/progress-initialized.event";
import { SubmissionReceivedEvent } from "./events/submission-received.event";
import { BlockResult } from "./value-objects/block-result.vo";
import { StudentSubmissionDto } from "../application/dto/student-submission.dto";

/**
 * @class StudentProgress
 * @description
 * The Aggregate Root representing a student's progress within a specific Course.
 *
 * Responsibilities:
 * - Consistency Boundary: Ensures scores and statuses (Lesson/Course) are always in sync.
 * - State Management: Transitions blocks (PENDING -> GRADED) and containers (IN_PROGRESS -> COMPLETED).
 * - Idempotency: Prevents duplicate scoring for the same block.
 * - Event Generation: Emits domain events for Read Models and side effects (Certificates, Gamification).
 *
 * Structure:
 * Course -> Lessons -> Blocks (Grades)
 */
export class StudentProgress extends AggregateRoot {
  private readonly _id: string;
  private readonly _enrollmentId: string;
  private readonly _courseId: string;
  private readonly _studentId: string;
  private _status: ProgressStatus;
  private readonly _lessons: Record<string, StudentLessonProgress>;
  private _currentScore: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: StudentCourseProgress) {
    super();
    this._id = props.id;
    this._enrollmentId = props.enrollmentId;
    this._courseId = props.courseId;
    this._studentId = props.studentId;
    this._status = props.status;
    this._lessons = props.lessons;
    this._currentScore = props.currentScore;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Factory method to initialize a fresh progress tracker for a new enrollment.
   * Emits @see ProgressInitializedEvent
   */
  static create(id: string, enrollmentId: string, courseId: string, studentId: string): StudentProgress {
    const instance = new StudentProgress({
      id,
      enrollmentId,
      courseId,
      studentId,
      status: ProgressStatus.NOT_STARTED,
      lessons: {},
      currentScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    instance.apply(new ProgressInitializedEvent(id, studentId, courseId, enrollmentId));

    return instance;
  }

  /**
   * Marks the course as started (IN_PROGRESS) if it hasn't been touched yet.
   */
  public startCourse(): void {
    if (this._status === ProgressStatus.NOT_STARTED) {
      this._status = ProgressStatus.IN_PROGRESS;
      this.updateTimestamp();
    }
  }

  /**
   * Completes a synchronous block (Video, Text, Quiz).
   *
   * @param blockId - The ID of the block being completed.
   * @param lessonId - The parent lesson ID.
   * @param totalBlocksInLesson - Total count of blocks in this lesson (fetched from Content Service).
   * @param totalLessonsInCourse - Total count of lessons in this course.
   * @param score - Score to assign (usually 100 for viewable content).
   * @param submissionData - Optional metadata (e.g., quiz answers).
   *
   * Side Effects:
   * - Updates Block status to GRADED.
   * - Recalculates Lesson and Course completion status.
   * - Emits @see BlockCompletedEvent
   */
  public completeBlockSync(
    blockId: string,
    lessonId: string,
    totalBlocksInLesson: number,
    totalLessonsInCourse: number,
    score: number,
    submissionData?: unknown,
  ): void {
    this.ensureCourseStarted();
    this.ensureLessonInitialized(lessonId);
    this.ensureNotCompleted(lessonId, blockId);

    const result = new BlockResult(score, new Date(), GradingStatus.GRADED, submissionData);
    this._lessons[lessonId].completedBlocks[blockId] = result;

    this.recalculateLessonState(lessonId, totalBlocksInLesson);
    this.recalculateCourseState(totalLessonsInCourse);

    this.updateTimestamp();

    const currentLessonStatus = this._lessons[lessonId].status;

    const progressPercentage = this.calculatePercentage(totalLessonsInCourse, totalBlocksInLesson, lessonId);

    this.apply(
      new BlockCompletedEvent(
        this.id,
        this.studentId,
        this.courseId,
        lessonId,
        blockId,
        score,
        this._currentScore,
        currentLessonStatus,
        this._status,
        progressPercentage,
      ),
    );

    this.checkForCompletionEvent();
  }

  /**
   * Initiates an asynchronous submission (e.g., Code Challenge).
   * Sets the block status to PENDING and waits for the Runner.
   *
   * Emits @see SubmissionReceivedEvent to trigger the Saga.
   */
  public submitBlockAsync(blockId: string, lessonId: string, submissionData: StudentSubmissionDto): void {
    this.ensureCourseStarted();
    this.ensureLessonInitialized(lessonId);
    this.ensureNotCompleted(lessonId, blockId);

    const pendingResult = new BlockResult(0, new Date(), GradingStatus.PENDING, submissionData);
    this._lessons[lessonId].completedBlocks[blockId] = pendingResult;

    this.updateTimestamp();

    this.apply(new SubmissionReceivedEvent(this.id, this.studentId, this.courseId, lessonId, blockId, submissionData));
  }

  /**
   * Finalizes an asynchronous submission with a result from the Runner.
   *
   * @param score - Calculated score (0 or 100).
   * @param feedback - Stdout/Stderr or error message from the runner.
   *
   * Side Effects:
   * - Updates Block status from PENDING to GRADED.
   * - Recalculates totals.
   * - Emits @see BlockCompletedEvent
   */
  public gradeBlock(
    blockId: string,
    lessonId: string,
    totalBlocksInLesson: number,
    totalLessonsInCourse: number,
    score: number,
    feedback?: string,
  ): void {
    this.ensureLessonInitialized(lessonId);

    const previousAttempt = this._lessons[lessonId].completedBlocks[blockId];
    const originalSubmissionData = previousAttempt?.submissionData || null;

    const result = new BlockResult(score, new Date(), GradingStatus.GRADED, originalSubmissionData, feedback);

    this._lessons[lessonId].completedBlocks[blockId] = result;

    this.recalculateLessonState(lessonId, totalBlocksInLesson);
    this.recalculateCourseState(totalLessonsInCourse);

    this.updateTimestamp();

    const currentLessonStatus = this._lessons[lessonId].status;

    const progressPercentage = this.calculatePercentage(totalLessonsInCourse, totalBlocksInLesson, lessonId);

    this.apply(
      new BlockCompletedEvent(
        this.id,
        this.studentId,
        this.courseId,
        lessonId,
        blockId,
        score,
        this._currentScore,
        currentLessonStatus,
        this._status,
        progressPercentage,
      ),
    );

    this.checkForCompletionEvent();
  }

  // --- Invariants & Internals ---

  private ensureNotCompleted(lessonId: string, blockId: string): void {
    const existing = this._lessons[lessonId]?.completedBlocks[blockId];
    if (existing && existing.status === GradingStatus.GRADED && existing.score === 100) {
      throw new BadRequestException("You have already completed this block with max score.");
    }
  }

  private ensureLessonInitialized(lessonId: string): void {
    if (!this._lessons[lessonId]) {
      this._lessons[lessonId] = {
        completedBlocks: {},
        status: ProgressStatus.IN_PROGRESS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  private ensureCourseStarted(): void {
    if (this._status === ProgressStatus.NOT_STARTED) {
      this._status = ProgressStatus.IN_PROGRESS;
    }
  }

  /**
   * Checks if all blocks in the lesson are graded.
   * If yes, marks lesson as COMPLETED and emits @see LessonCompletedEvent.
   */
  private recalculateLessonState(lessonId: string, totalBlocksInLesson: number): void {
    const lesson = this._lessons[lessonId];

    // Idempotency: Do not complete twice
    if (lesson.status === ProgressStatus.COMPLETED) {
      return;
    }

    const gradedBlocks = Object.values(lesson.completedBlocks).filter(b => b.status === GradingStatus.GRADED);

    lesson.updatedAt = new Date();

    if (gradedBlocks.length >= totalBlocksInLesson) {
      lesson.status = ProgressStatus.COMPLETED;

      this.apply(new LessonCompletedEvent(this.id, this.studentId, this.courseId, lessonId));
    }
  }

  /**
   * Aggregates scores from all lessons and checks if all lessons are COMPLETED.
   */
  private recalculateCourseState(totalLessonsInCourse: number): void {
    const lessonsArray = Object.values(this._lessons);

    this._currentScore = lessonsArray.reduce((acc: number, lesson: StudentLessonProgress) => {
      const lessonScore = Object.values(lesson.completedBlocks)
        .filter(b => b.status === GradingStatus.GRADED)
        .reduce((sum: number, b: BlockResult) => sum + b.score, 0);
      return acc + lessonScore;
    }, 0);

    const completedLessonsCount = lessonsArray.filter(l => l.status === ProgressStatus.COMPLETED).length;

    if (completedLessonsCount >= totalLessonsInCourse && this._status !== ProgressStatus.COMPLETED) {
      this._status = ProgressStatus.COMPLETED;
    }
  }

  private checkForCompletionEvent(): void {
    if (this._status === ProgressStatus.COMPLETED) {
      this.apply(new CourseCompletedEvent(this.id, this.studentId, this.courseId));
    }
  }

  private updateTimestamp(): void {
    this._updatedAt = new Date();
  }

  private calculatePercentage(
    totalLessonsInCourse: number,
    currentLessonTotalBlocks: number,
    currentLessonId: string,
  ): number {
    if (totalLessonsInCourse === 0) return 0;

    let completedLessons = 0;
    let partialLessonProgress = 0;

    for (const [id, lesson] of Object.entries(this._lessons)) {
      if (lesson.status === ProgressStatus.COMPLETED) {
        completedLessons++;
      } else if (id === currentLessonId && currentLessonTotalBlocks > 0) {
        const gradedBlocks = Object.values(lesson.completedBlocks).filter(
          b => b.status === GradingStatus.GRADED,
        ).length;
        partialLessonProgress = gradedBlocks / currentLessonTotalBlocks;
      }
    }

    const percentage = ((completedLessons + partialLessonProgress) / totalLessonsInCourse) * 100;
    return Math.min(100, Math.round(percentage));
  }

  // --- Getters ---

  get id() {
    return this._id;
  }
  get enrollmentId() {
    return this._enrollmentId;
  }
  get courseId() {
    return this._courseId;
  }
  get studentId() {
    return this._studentId;
  }
  get status() {
    return this._status;
  }
  get currentScore() {
    return this._currentScore;
  }
  get lessons() {
    return this._lessons;
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }
}
