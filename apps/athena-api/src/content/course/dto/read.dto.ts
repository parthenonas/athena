import { Expose } from "class-transformer";

/**
 * @class ReadCourseDto
 * Safe representation of a Course entity returned to clients.
 *
 * Does NOT expose deletedAt (soft delete)
 * Does NOT include internal relations
 */
export class ReadCourseDto {
  /** Course UUID. */
  @Expose()
  id!: string;

  /** Title. */
  @Expose()
  title!: string;

  /** Description. */
  @Expose()
  description!: string | null;

  /** Author UUID. */
  @Expose()
  ownerId!: string;

  /** Tags. */
  @Expose()
  tags!: string[];

  /** Publication status. */
  @Expose()
  isPublished!: boolean;

  /** Timestamp of creation. */
  @Expose()
  createdAt!: Date;

  /** Timestamp of last update. */
  @Expose()
  updatedAt!: Date;
}
