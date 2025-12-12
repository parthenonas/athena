import { Type } from "class-transformer";
import { IsNotEmpty, IsString, IsUUID, ValidateNested } from "class-validator";

import { RunnerCodeBlockContentDto } from "../../../shared/dto/runner-code-block-content.dto";

export class BlockDryRunDto {
  @IsUUID()
  @IsNotEmpty()
  lessonId!: string;

  @ValidateNested()
  @Type(() => RunnerCodeBlockContentDto)
  @IsNotEmpty()
  content!: RunnerCodeBlockContentDto;

  @IsString()
  @IsNotEmpty()
  socketId!: string;
}
