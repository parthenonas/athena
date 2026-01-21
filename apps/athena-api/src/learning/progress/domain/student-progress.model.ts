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

  public startCourse(): void {
    if (this._status === ProgressStatus.NOT_STARTED) {
      this._status = ProgressStatus.IN_PROGRESS;
      this.updateTimestamp();
    }
  }

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
      ),
    );

    this.checkForCompletionEvent();
  }

  public submitBlockAsync(blockId: string, lessonId: string, submissionData: StudentSubmissionDto): void {
    this.ensureCourseStarted();
    this.ensureLessonInitialized(lessonId);
    this.ensureNotCompleted(lessonId, blockId);

    const pendingResult = new BlockResult(0, new Date(), GradingStatus.PENDING, submissionData);
    this._lessons[lessonId].completedBlocks[blockId] = pendingResult;

    this.updateTimestamp();

    this.apply(new SubmissionReceivedEvent(this.id, this.studentId, this.courseId, lessonId, blockId, submissionData));
  }

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
      ),
    );

    this.checkForCompletionEvent();
  }

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

  private recalculateLessonState(lessonId: string, totalBlocksInLesson: number): void {
    const lesson = this._lessons[lessonId];

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

  private recalculateCourseState(totalLessonsInCourse: number): void {
    const lessonsArray = Object.values(this._lessons);

    this._currentScore = lessonsArray.reduce((acc: number, lesson: StudentLessonProgress) => {
      const lessonScore = Object.values(lesson.completedBlocks)
        .filter(b => b.status === GradingStatus.GRADED)
        .reduce((sum: number, b: BlockResult) => sum + b.score, 0) as number;
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
