import { BlockType, FilterLibraryBlockRequest } from "@athena/types";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

/**
 * @class FilterLibraryBlockDto
 * @description Query parameters for searching the block library.
 * Handles pagination and GIN-index friendly tag filtering.
 */
export class FilterLibraryBlockDto implements FilterLibraryBlockRequest {
  /** Filter by specific block type. */
  @IsOptional()
  @IsEnum(BlockType)
  type?: BlockType;

  /**
   * Search by tags.
   * Transforms single query string (?tags=sql) into array (["sql"]).
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  })
  @IsString({ each: true })
  tags?: string[];

  /**
   * Optional full-text search across content/titles.
   */
  @IsOptional()
  @IsString()
  search?: string;

  /** Pagination: Current page number. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /** Pagination: Items per page. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  /** Sorting field. */
  @IsOptional()
  @IsIn(["type", "createdAt", "updatedAt"])
  sortBy: "type" | "createdAt" | "updatedAt" = "createdAt";

  /** Sorting direction. */
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  sortOrder: "ASC" | "DESC" | "asc" | "desc" = "DESC";
}
