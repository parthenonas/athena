import { IsNotEmpty, IsUrl, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RunnerCodeBlockContentDto } from './runner-code-block-content.dto';

// NOTE: RunnerCodeBlockContentDto must be defined/imported

/**
 * @class RunnerJobDataDto
 * DTO for the job payload sent to the BullMQ Execution Queue.
 * Contains all necessary data for code execution and callback reporting.
 */
export class RunnerJobDataDto {
  /** ID of the parent Submission/Attempt entity in the main API for status update. */
  @IsString()
  @IsNotEmpty()
  submissionId!: string;

  /** Full URL where the final result should be reported (Callback URL, HTTP PATCH). */
  @IsString()
  @IsUrl()
  @IsNotEmpty()
  callbackUrl!: string;

  /** The validated content of the code block, including source code and execution limits. */
  @Type(() => RunnerCodeBlockContentDto)
  @ValidateNested()
  @IsNotEmpty()
  content!: RunnerCodeBlockContentDto;
}
