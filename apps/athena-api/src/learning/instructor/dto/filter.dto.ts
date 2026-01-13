import { FilterInstructorRequest, type SortOrder } from "@athena/types";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

/**
 * @class FilterInstructorDto
 * DTO for listing instructors.
 */
export class FilterInstructorDto implements FilterInstructorRequest {
  /** Find specific instructor by account ID. */
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  /** Search by title or bio (ILIKE). */
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
  @IsIn(["createdAt", "title"])
  sortBy: "createdAt" | "title" = "createdAt";

  /** Sorting direction. */
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  sortOrder: SortOrder = "DESC";
}
