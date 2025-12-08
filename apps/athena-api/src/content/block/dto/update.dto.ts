import { PartialType } from "@nestjs/mapped-types";
import { IsNumber, IsNotEmpty } from "class-validator";

import { CreateBlockDto } from "./create.dto";

/**
 * @class UpdateBlockDto
 * @description Payload for updating an existing Block.
 * All fields are optional.
 */
export class UpdateBlockDto extends PartialType(CreateBlockDto) {}

/**
 * @class ReorderBlockDto
 * @description Payload for moving a block to a new position.
 */
export class ReorderBlockDto {
  /**
   * The new sort index.
   * Typically calculated on frontend as (prev + next) / 2.
   */
  @IsNumber()
  @IsNotEmpty()
  newOrderIndex!: number;
}
