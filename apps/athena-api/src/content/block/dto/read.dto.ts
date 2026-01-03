import { BlockRequiredAction, BlockResponse, BlockType } from "@athena/types";
import { Expose } from "class-transformer";

/**
 * @class ReadBlockDto
 * @description Safe response DTO representing a Content Block.
 *
 * Exposes polymorphic content and ordering information.
 */
export class ReadBlockDto implements BlockResponse {
  /** Block UUID. */
  @Expose()
  id!: string;

  /** Parent Lesson UUID. */
  @Expose()
  lessonId!: string;

  /** Block Type (Discriminator). */
  @Expose()
  type!: BlockType;

  /**
   * Polymorphic content payload.
   * Structure depends on `type`.
   */
  @Expose()
  content!: { json: Record<string, unknown> };

  /**
   * What the student must do to complete this block.
   * Defaults to VIEW if not provided.
   */
  @Expose()
  requiredAction!: BlockRequiredAction;

  /**
   * Double precision index for sorting.
   */
  @Expose()
  orderIndex!: number;

  /** Timestamp of creation. */
  @Expose()
  createdAt!: Date;

  /** Timestamp of last update. */
  @Expose()
  updatedAt!: Date;
}
