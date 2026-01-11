import { InstructorResponse } from "@athena/types";
import { Expose } from "class-transformer";

/**
 * @class ReadInstructorDto
 * Safe representation of an Instructor entity returned to clients.
 */
export class ReadInstructorDto implements InstructorResponse {
  /** Instructor UUID. */
  @Expose()
  id!: string;

  /** Linked Account UUID. */
  @Expose()
  accountId!: string;

  /** Biography. */
  @Expose()
  bio!: string | null;

  /** Academic title. */
  @Expose()
  title!: string | null;

  /** Creation timestamp. */
  @Expose()
  createdAt!: Date;

  /** Update timestamp. */
  @Expose()
  updatedAt!: Date;
}
