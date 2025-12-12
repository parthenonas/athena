import { SubmissionResult, ExecutionStatus } from '@athena/types';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * @class SubmissionResultDto
 * DTO containing the final results of the code execution.
 * Sent back to the main API via the Callback URL.
 */
export class SubmissionResultDto implements SubmissionResult {
  /** ID of the Submission/Attempt entity whose result is being returned. */
  @IsString()
  @IsNotEmpty()
  submissionId!: string;

  /** Final execution status (e.g., 'ac', 'wa', 'tle', 'ce'). */
  @IsString()
  @IsNotEmpty()
  status!: ExecutionStatus;

  /** CPU time used by the program, in seconds. Optional if execution failed early. */
  @IsNumber()
  @IsOptional()
  time?: number;

  /** Memory usage during execution (in bytes/KB/MB). Optional if execution failed early. */
  @IsNumber()
  @IsOptional()
  memory?: number;

  /** Standard output of the user's program. */
  @IsString()
  @IsOptional()
  stdout?: string;

  /** Standard error output of the user's program. */
  @IsString()
  @IsOptional()
  stderr?: string;

  /** Compiler output, if Compilation Error (CE) occurred. */
  @IsString()
  @IsOptional()
  compileOutput?: string;

  /** Additional system message or description of a runtime/system error. */
  @IsString()
  @IsOptional()
  message?: string;
}
