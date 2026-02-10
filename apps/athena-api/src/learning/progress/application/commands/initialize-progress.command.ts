import { Command } from "@nestjs/cqrs";

/**
 * @class InitializeProgressCommand
 * @description
 * Command to create a new progress tracking record for a student.
 *
 * Characteristics:
 * - Idempotent: Should check if progress already exists before creating.
 * - Initialization: Sets status to NOT_STARTED and prepares the aggregate.
 *
 * Triggered by:
 * - ProgressEventListener (in response to ENROLLMENT_CREATED event).
 */
export class InitializeProgressCommand extends Command<void> {
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
