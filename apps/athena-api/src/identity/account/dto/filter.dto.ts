import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * @class FilterAccountDto
 * DTO for listing/filtering/paginating accounts in the admin panel.
 *
 * Supports:
 * - ILIKE search by search term
 * - Pagination (page, limit)
 * - Sorting (sortBy, sortOrder)
 */
export class FilterAccountDto {
  /** Full-text search by login (ILIKE %search%). */
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
  @IsIn(["login", "status", "createdAt", "updatedAt"])
  sortBy: "login" | "status" | "createdAt" | "updatedAt" = "createdAt";

  /** Sorting direction. */
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  sortOrder: "ASC" | "DESC" | "asc" | "desc" = "DESC";
}
