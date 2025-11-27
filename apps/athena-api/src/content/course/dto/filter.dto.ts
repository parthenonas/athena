import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * @class FilterCourseDto
 * DTO for listing/filtering/paginating courses.
 *
 * Supports:
 * - ILIKE search by title
 * - Pagination (page, limit)
 * - Sorting (title, createdAt, updatedAt)
 */
export class FilterCourseDto {
  /** Search by title (ILIKE %search%). */
  @IsOptional()
  @IsString()
  search?: string;

  /** Page number (1-based). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /** Page size (default: 20, max: 100). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  /** Sorting field. */
  @IsOptional()
  @IsIn(["title", "createdAt", "updatedAt"])
  sortBy: "title" | "createdAt" | "updatedAt" = "createdAt";

  /** Sorting direction. */
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  sortOrder: "ASC" | "DESC" | "asc" | "desc" = "DESC";
}
