import { BlockRequiredAction, BlockType, CreateBlockRequest } from "@athena/types";
import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsUUID } from "class-validator";

/**
 * @class CreateBlockDto
 * @description Payload for creating a new Content Block.
 *
 * Contains:
 * - lessonId (required) to link the block
 * - type (required) determines validation logic
 * - content (required) polymorphic JSON payload
 * - orderIndex (optional) defaults to end of list
 */
export class CreateBlockDto implements CreateBlockRequest {
  /** The UUID of the parent Lesson. */
  @IsUUID()
  @IsNotEmpty()
  lessonId!: string;

  /** The type of block (Text, Video, Code, etc.). Drives validation. */
  @IsEnum(BlockType)
  type!: BlockType;

  /**
   * Raw JSON content.
   * Validated manually in BlockService based on `type`.
   */
  @IsObject()
  @IsNotEmpty()
  content!: Record<string, unknown>;

  /**
   * Specific order index.
   * If omitted, the block is appended to the end of the lesson.
   */
  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  /**
   * What the student must do to complete this block.
   * Defaults to VIEW if not provided.
   */
  @IsOptional()
  @IsEnum(BlockRequiredAction)
  requiredAction?: BlockRequiredAction;
}
