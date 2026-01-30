import { StudentSubmissionDto } from "../../application/dto/student-submission.dto";

/**
 * @class SubmissionReceivedEvent
 * @description
 * Emitted when a student submits code for an asynchronous task.
 * At this point, the code is NOT graded yet.
 *
 * Triggered by:
 * - SubmitAssignmentHandler.
 *
 * Consumers:
 * - ProgressSagas: Intercepts this event to prepare the payload and send it to the Submission Queue.
 * - ReadModelProjector: Updates the block status to "PENDING" in the UI (showing a spinner).
 */
export class SubmissionReceivedEvent {
  constructor(
    public readonly progressId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly lessonId: string,
    public readonly blockId: string,

    /**
     * The raw submission payload (code, language).
     */
    public readonly submissionData: StudentSubmissionDto,
  ) {}
}
