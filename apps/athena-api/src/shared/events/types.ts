import { SubmissionResult } from "@athena/types";

export enum AthenaEvent {
  ROLE_DELETED = "role.deleted",
  SUBMISSION_COMPLETED = "submission.completed",
}

export interface SubmissionCompletedEvent {
  result: SubmissionResult;
}

export interface RoleDeletedEvent {
  name: string;
}
