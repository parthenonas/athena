import { type BlockContent, BlockType, LibraryBlockResponse } from "@athena/types";
import { Expose } from "class-transformer";

/**
 * @class ReadLibraryBlockDto
 * @description Safe response DTO representing a Library Block template.
 *
 * Exposes polymorphic content, tags, and ownership info.
 */
export class ReadLibraryBlockDto implements LibraryBlockResponse {
  /** Template UUID. */
  @Expose()
  id!: string;

  /** Owner UUID (the instructor who created the template). */
  @Expose()
  ownerId!: string;

  /** Block Type (Discriminator). */
  @Expose()
  type!: BlockType;

  /** Array of categorized tags. */
  @Expose()
  tags!: string[];

  /**
   * Polymorphic content payload.
   * Structure depends on `type`.
   */
  @Expose()
  content!: BlockContent;

  /** Timestamp of creation. */
  @Expose()
  createdAt!: Date;

  /** Timestamp of last update. */
  @Expose()
  updatedAt!: Date;
}
