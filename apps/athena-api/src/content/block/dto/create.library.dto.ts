import { type BlockContent, BlockType, CreateLibraryBlockRequest } from "@athena/types";
import { IsArray, IsEnum, IsNotEmpty, IsObject, IsString } from "class-validator";

/**
 * @class CreateLibraryBlockDto
 * @description Payload for saving a block template into the Library.
 *
 * Contains:
 * - type (required) determines what kind of block it is (e.g. quiz_question)
 * - tags (required) array of strings for GIN-indexed searching
 * - content (required) polymorphic JSON payload
 */
export class CreateLibraryBlockDto implements CreateLibraryBlockRequest {
  /** The type of block template. Drives frontend rendering and backend validation. */
  @IsEnum(BlockType)
  @IsNotEmpty()
  type!: BlockType;

  /**
   * Array of tags for categorization and fast searching.
   * Example: ["sql", "join", "hard"]
   */
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  tags!: string[];

  /**
   * Raw JSON content of the block.
   * Validated manually in the service based on `type`.
   */
  @IsObject()
  @IsNotEmpty()
  content!: BlockContent;
}
