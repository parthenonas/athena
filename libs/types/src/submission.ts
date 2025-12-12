import { CodeBlockContent } from "./block";

export enum ExecutionStatus {
  Accepted = "ac",
  WrongAnswer = "wa",
  TimeLimitExceeded = "tle",
  WallTimeLimitExceeded = "wtle",
  MemoryLimitExceeded = "mle",
  CompilationError = "ce",
  RuntimeError = "rte",
  SystemError = "syserr",
  Processing = "process",
  InQueue = "queue",
}

export interface SubmissionMetadata {
  socketId?: string;
  [key: string]: string;
}

export interface SubmissionResult {
  submissionId: string;
  status: ExecutionStatus;
  time?: number;
  memory?: number;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  message?: string;
  metadata?: SubmissionMetadata;
}

export type SubmissionCompletedEvent = SubmissionResult;

export interface SubmissionPayload {
  submissionId: string;
  content: CodeBlockContent;
  metadata?: SubmissionMetadata;
}
