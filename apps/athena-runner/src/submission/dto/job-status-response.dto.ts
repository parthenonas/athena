import { SubmissionResultDto } from "./submission-result.dto";

export class JobStatusResponseDto {
  /** The internal BullMQ Job ID. */
  jobId: string;

  /** The ID of the submission (from your business logic). */
  submissionId?: string;

  /** Current state of the job (e.g., 'completed', 'failed', 'active'). */
  state: string;

  /** * The execution result.
   * Present only if the job has completed successfully.
   */
  result?: SubmissionResultDto;

  /** * Error message or reason.
   * Present only if the job has failed.
   */
  error?: string;

  /** Timestamp when the job started processing. */
  processedOn?: number;

  /** Timestamp when the job finished. */
  finishedOn?: number;
}
