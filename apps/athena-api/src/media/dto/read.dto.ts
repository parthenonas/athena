import { FileAccess, FileResponse } from "@athena/types";
import { Expose, Transform } from "class-transformer";

/**
 * @class ReadFileDto
 * Safe representation of a stored file.
 *
 * Includes the computed `url` for downloading/viewing the file.
 * Hides internal storage details (bucket, storage key).
 */
export class ReadFileDto implements FileResponse {
  @Expose()
  id!: string;

  @Expose()
  url!: string;

  @Expose()
  originalName!: string;

  @Expose()
  mimeType!: string;

  /**
   * File size in bytes.
   * Converted from BigInt (DB) to Number (JSON) for frontend convenience.
   */
  @Expose()
  @Transform(({ value }) => parseInt(value, 10))
  size!: number;

  @Expose()
  access!: FileAccess;

  @Expose()
  ownerId!: string;

  @Expose()
  createdAt!: Date;
}
