import { Command } from "@nestjs/cqrs";

/**
 * @class GradeBlockCommand
 * @description
 * Command to apply a grade and feedback to a block AFTER asynchronous execution.
 *
 * Characteristics:
 * - Asynchronous: Triggered only when the Code Runner returns a verdict.
 * - Side Effects: Updates the block status from PENDING to GRADED.
 *
 * Triggered by:
 * - GradingListener (in response to SUBMISSION_COMPLETED event).
 */
export class GradeBlockCommand extends Command<void> {
  constructor(
    /**
     * The ID of the student.
     */
    public readonly userId: string,

    /**
     * The Course ID context.
     */
    public readonly courseId: string,

    /**
     * The Lesson ID context.
     */
    public readonly lessonId: string,

    /**
     * The specific Block ID being graded.
     */
    public readonly blockId: string,

    /**
     * The final score calculated based on the runner's verdict (0 or 100).
     */
    public readonly score: number,

    /**
     * Optional output from stdout/stderr or system error messages.
     */
    public readonly feedback?: string,
  ) {
    super();
  }
}
