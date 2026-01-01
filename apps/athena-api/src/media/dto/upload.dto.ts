import { FileAccess } from "@athena/types";
import { IsEnum, IsOptional } from "class-validator";

/**
 * @class UploadFileDto
 * Metadata sent alongside the file upload.
 *
 * @example
 * FormData:
 * - file: (binary)
 * - access: "public"
 */
export class UploadFileDto {
  /**
   * Visibility of the file.
   * Defaults to 'private' if not specified.
   */
  @IsOptional()
  @IsEnum(FileAccess)
  access?: FileAccess = FileAccess.Private;
}
