import { FilterFileRequest, type SortOrder } from "@athena/types";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * @class FilterFileDto
 * Request DTO for listing and filtering files.
 * Used in "My Files" and Admin Dashboard.
 */
export class FilterFileDto implements FilterFileRequest {
  /**
   * Search by original filename (case-insensitive ILIKE).
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filter by MIME type prefix.
   * Example: "image" will match "image/png", "image/jpeg".
   * Example: "application/pdf".
   */
  @IsOptional()
  @IsString()
  type?: string;

  /**
   * Filter by exact owner ID (Admin only).
   */
  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsIn(["originalName", "size", "createdAt"])
  sortBy: "originalName" | "size" | "createdAt" = "createdAt";

  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  sortOrder: SortOrder = "DESC";
}
