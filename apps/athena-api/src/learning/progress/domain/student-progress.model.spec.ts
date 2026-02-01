import { GradingStatus, ProgrammingLanguage, ProgressStatus } from "@athena/types";
import { BadRequestException } from "@nestjs/common";

import { BlockCompletedEvent } from "./events/block-completed.event";
import { CourseCompletedEvent } from "./events/course-completed.event";
import { LessonCompletedEvent } from "./events/lesson-completed.event";
import { ProgressInitializedEvent } from "./events/progress-initialized.event";
import { SubmissionReceivedEvent } from "./events/submission-received.event";
import { StudentProgress } from "./student-progress.model";

describe("StudentProgress Aggregate", () => {
  const ID = "progress-123";
  const ENROLLMENT_ID = "enrollment-123";
  const COURSE_ID = "course-123";
  const STUDENT_ID = "student-123";
  const LESSON_ID = "lesson-1";
  const BLOCK_ID = "block-1";

  const getLastEvent = <T>(aggregate: StudentProgress, type: any): T | undefined => {
    const events = aggregate.getUncommittedEvents();
    return events.reverse().find(e => e instanceof type) as T;
  };

  let progress: StudentProgress;

  beforeEach(() => {
    progress = StudentProgress.create(ID, ENROLLMENT_ID, COURSE_ID, STUDENT_ID);
    progress.commit();
  });

  describe("Initialization", () => {
    it("should create instance and apply ProgressInitializedEvent", () => {
      const newProgress = StudentProgress.create(ID, ENROLLMENT_ID, COURSE_ID, STUDENT_ID);

      expect(newProgress.id).toBe(ID);
      expect(newProgress.status).toBe(ProgressStatus.NOT_STARTED);
      expect(newProgress.lessons).toEqual({});

      const event = getLastEvent<ProgressInitializedEvent>(newProgress, ProgressInitializedEvent);
      expect(event).toBeDefined();
      expect(event?.progressId).toBe(ID);
    });
  });

  describe("completeBlockSync (Video/Text)", () => {
    it("should complete a block, update score and emit BlockCompletedEvent", () => {
      const score = 100;
      progress.completeBlockSync(BLOCK_ID, LESSON_ID, 1, 1, score);

      const lesson = progress.lessons[LESSON_ID];
      const block = lesson.completedBlocks[BLOCK_ID];

      expect(block.score).toBe(score);
      expect(block.status).toBe(GradingStatus.GRADED);
      expect(progress.currentScore).toBe(score);
      expect(progress.status).toBe(ProgressStatus.COMPLETED);

      const event = getLastEvent<BlockCompletedEvent>(progress, BlockCompletedEvent);
      expect(event).toBeDefined();
      expect(event?.score).toBe(score);
      expect(event?.lessonStatus).toBe(ProgressStatus.COMPLETED);
      expect(event?.courseStatus).toBe(ProgressStatus.COMPLETED);
    });

    it("should calculate total score correctly for multiple blocks", () => {
      progress.completeBlockSync("b1", LESSON_ID, 2, 1, 50);
      expect(progress.currentScore).toBe(50);
      expect(progress.lessons[LESSON_ID].status).toBe(ProgressStatus.IN_PROGRESS);

      progress.completeBlockSync("b2", LESSON_ID, 2, 1, 50);
      expect(progress.currentScore).toBe(100);
      expect(progress.lessons[LESSON_ID].status).toBe(ProgressStatus.COMPLETED);
    });

    it("should throw BadRequestException if block already completed with max score", () => {
      progress.completeBlockSync(BLOCK_ID, LESSON_ID, 1, 1, 100);

      expect(() => {
        progress.completeBlockSync(BLOCK_ID, LESSON_ID, 1, 1, 100);
      }).toThrow(BadRequestException);
    });

    it("should emit LessonCompletedEvent when all blocks in lesson are done", () => {
      const totalBlocks = 2;

      progress.completeBlockSync("b1", LESSON_ID, totalBlocks, 1, 50);
      let event = getLastEvent<LessonCompletedEvent>(progress, LessonCompletedEvent);
      expect(event).toBeUndefined();

      progress.completeBlockSync("b2", LESSON_ID, totalBlocks, 1, 50);
      event = getLastEvent<LessonCompletedEvent>(progress, LessonCompletedEvent);

      expect(event).toBeDefined();
      expect(event?.lessonId).toBe(LESSON_ID);
    });

    it("should emit CourseCompletedEvent when all lessons are done", () => {
      progress.completeBlockSync("b1", "l1", 1, 2, 100);
      expect(progress.status).toBe(ProgressStatus.IN_PROGRESS);

      progress.completeBlockSync("b1", "l2", 1, 2, 100);
      expect(progress.status).toBe(ProgressStatus.COMPLETED);

      const event = getLastEvent<CourseCompletedEvent>(progress, CourseCompletedEvent);
      expect(event).toBeDefined();
      expect(event?.courseId).toBe(COURSE_ID);
    });
  });

  describe("submitBlockAsync (Code)", () => {
    it("should set block status to PENDING and emit SubmissionReceivedEvent", () => {
      const submission = { code: "console.log('hi')", language: ProgrammingLanguage.Python, socketId: "s1" };

      progress.submitBlockAsync(BLOCK_ID, LESSON_ID, submission);

      const block = progress.lessons[LESSON_ID].completedBlocks[BLOCK_ID];

      expect(block.status).toBe(GradingStatus.PENDING);
      expect(block.score).toBe(0);

      const event = getLastEvent<SubmissionReceivedEvent>(progress, SubmissionReceivedEvent);
      expect(event).toBeDefined();
      expect(event?.submissionData).toEqual(submission);
      expect(event?.lessonId).toBe(LESSON_ID);
    });
  });

  describe("gradeBlock (Code Result)", () => {
    it("should update score and status from PENDING to GRADED", () => {
      progress.submitBlockAsync(BLOCK_ID, LESSON_ID, {
        code: "...",
        language: ProgrammingLanguage.Python,
        socketId: "s1",
      });

      const score = 100;
      const feedback = "Good job";
      progress.gradeBlock(BLOCK_ID, LESSON_ID, 1, 1, score, feedback);

      const block = progress.lessons[LESSON_ID].completedBlocks[BLOCK_ID];

      expect(block.status).toBe(GradingStatus.GRADED);
      expect(block.score).toBe(score);
      expect(block.feedback).toBe(feedback);
      expect(block.submissionData).toEqual({ code: "...", language: "python", socketId: "s1" });

      const event = getLastEvent<BlockCompletedEvent>(progress, BlockCompletedEvent);
      expect(event).toBeDefined();
      expect(event?.score).toBe(score);
    });

    it("should handle re-submission (improve score)", () => {
      progress.gradeBlock(BLOCK_ID, LESSON_ID, 1, 1, 0, "Error");
      expect(progress.currentScore).toBe(0);

      progress.gradeBlock(BLOCK_ID, LESSON_ID, 1, 1, 100, "Success");

      expect(progress.currentScore).toBe(100);
      expect(progress.lessons[LESSON_ID].completedBlocks[BLOCK_ID].score).toBe(100);
    });
  });
});
