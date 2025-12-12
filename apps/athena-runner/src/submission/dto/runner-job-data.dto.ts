import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';

import { RunnerCodeBlockContentDto } from './runner-code-block-content.dto';

// NOTE: RunnerCodeBlockContentDto must be defined/imported

/**
 * @class RunnerJobDataDto
 * DTO for the job payload sent to the BullMQ Execution Queue.
 */
export class RunnerJobDataDto {
  /** ID of the parent Submission/Attempt entity in the main API for status update. */
  @IsString()
  @IsNotEmpty()
  submissionId!: string;

  /** The validated content of the code block, including source code and execution limits. */
  @Type(() => RunnerCodeBlockContentDto)
  @ValidateNested()
  @IsNotEmpty()
  content!: RunnerCodeBlockContentDto;
}
