import { BlockDryRunRequest } from "@athena/types";
import { Type } from "class-transformer";
import { IsNotEmpty, IsString, ValidateNested } from "class-validator";

import { RunnerCodeBlockContentDto } from "../../../shared/dto/runner-code-block-content.dto";

export class BlockDryRunDto implements BlockDryRunRequest {
  @ValidateNested()
  @Type(() => RunnerCodeBlockContentDto)
  @IsNotEmpty()
  content!: RunnerCodeBlockContentDto;

  @IsString()
  @IsNotEmpty()
  socketId!: string;

  @IsString()
  @IsNotEmpty()
  blockId!: string;
}
