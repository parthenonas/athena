import { SubmissionResult } from "@athena/types";

export enum AthenaEvent {
  ROLE_DELETED = "role.deleted",
  SUBMISSION_COMPLETED = "submission.completed",
  ENROLLMENT_CREATED = "enrollment.created",
  PROFILE_UPDATED = "profile.updated",
}

export interface SubmissionCompletedEvent {
  result: SubmissionResult;
}

export interface RoleDeletedEvent {
  name: string;
}

export interface EnrollmentCreatedEvent {
  id: string;
  userId: string;
  cohortId: string;
  courseId: string;
}
