import { Command } from "@nestjs/cqrs";

/**
 * @class DeleteProgressCommand
 * @description
 * Command to delete all progress of a student.
 *
 * Triggered by:
 * - ProgressEventListener (in response to ENROLLMENT_DELETED event).
 */
export class DeleteProgressCommand extends Command<void> {
  constructor(
    /**
     * The ID of the enrollment record (links Progress to Billing/Access).
     */
    public readonly enrollmentId: string,

    /**
     * The Course ID the student enrolled in.
     */
    public readonly courseId: string,

    /**
     * The Student's Account ID.
     */
    public readonly studentId: string,
  ) {
    super();
  }
}
