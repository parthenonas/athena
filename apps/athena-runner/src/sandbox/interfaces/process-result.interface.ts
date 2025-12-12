/**
 * @interface ProcessResult
 * Data structure containing the execution result from a child process (e.g., isolate).
 */
export interface ProcessResult {
  /** Standard output captured from the process. */
  stdout: string;
  /** Standard error captured from the process. */
  stderr: string;
  /** The exit code of the process. */
  exitCode: number;
}
