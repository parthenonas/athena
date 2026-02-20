import { ProgressStatus } from "@athena/types";

/**
 * @class BlockCompletedEvent
 * @description
 * Emitted when a learning block is successfully graded (scored).
 *
 * Characteristics:
 * - Snapshot: Carries the *resultant* status of the Lesson and Course.
 * This allows Read Models to update atomically without recalculating the whole tree.
 *
 * Triggered by:
 * - Synchronous completion (Video/Text view).
 * - Asynchronous completion (Code Runner grade).
 *
 * Consumers:
 * - ReadModelProjector: Updates the student's dashboard and progress bars.
 * - GamificationService: Awards XP points.
 */
export class BlockCompletedEvent {
  constructor(
    /**
     * The Aggregate Root ID.
     */
    public readonly progressId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly lessonId: string,
    public readonly blockId: string,

    /**
     * The score assigned to this specific block (0-100).
     */
    public readonly score: number,

    /**
     * The total accumulated score for the entire course *after* this block.
     */
    public readonly courseScore: number,

    /**
     * The status of the lesson *after* this block was completed.
     * (e.g., did this block finish the lesson?)
     */
    public readonly lessonStatus: ProgressStatus,

    /**
     * The status of the course *after* this block was completed.
     */
    public readonly courseStatus: ProgressStatus,
    public readonly progressPercentage: number,
  ) {}
}
