import { FilterCohortRequest, type SortOrder } from "@athena/types";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

/**
 * @class FilterCohortDto
 * DTO for listing/filtering/paginating cohorts.
 */
export class FilterCohortDto implements FilterCohortRequest {
  /** Search by name (ILIKE %search%). */
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by specific instructor. */
  @IsOptional()
  @IsUUID()
  instructorId?: string;

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
  @IsIn(["name", "startDate", "createdAt"])
  sortBy: "name" | "startDate" | "createdAt" = "createdAt";

  /** Sorting direction. */
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  sortOrder: SortOrder = "DESC";
}
