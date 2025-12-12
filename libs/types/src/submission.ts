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

export interface SubmissionResult {
  submissionId: string;
  status: ExecutionStatus;
  time?: number;
  memory?: number;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  message?: string;
  metadata?: unknown;
}
