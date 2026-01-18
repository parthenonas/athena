import { ProgrammingLanguage } from "./block";

export enum ProgressStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export enum GradingStatus {
  PENDING = "PENDING",
  GRADED = "GRADED",
  FAILED = "FAILED",
}

export interface StudentSubmissionRequest {
  code: string;
  language: ProgrammingLanguage;
  socketId: string;
}
