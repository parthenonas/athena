import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * @class FilterRoleDto
 *
 * DTO for listing/filtering/paginating roles in the admin panel.
 *
 * Supports:
 * - ILIKE search by role name
 * - Pagination (page, limit)
 * - Sorting: name, createdAt, updatedAt
 */
export class FilterRoleDto {
  /** Full-text search by role name (ILIKE %search%). */
  @IsOptional()
  @IsString()
  search?: string;

  /** Page number (1-based). Default: 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /** Page size. Default: 20, max: 100. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  /** Sorting field. */
  @IsOptional()
  @IsIn(["name", "createdAt", "updatedAt"])
  sortBy: "name" | "createdAt" | "updatedAt" = "createdAt";

  /** Sorting direction. */
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  sortOrder: "ASC" | "DESC" | "asc" | "desc" = "DESC";
}
