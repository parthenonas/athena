import { FilterScheduleRequest, type SortOrder } from "@athena/types";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

/**
 * @class FilterScheduleDto
 * DTO for querying the timetable.
 */
export class FilterScheduleDto implements FilterScheduleRequest {
  /** Filter by cohort. */
  @IsOptional()
  @IsUUID()
  cohortId?: string;

  /** Filter by lesson. */
  @IsOptional()
  @IsUUID()
  lessonId?: string;

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
  @IsIn(["startAt", "createdAt"])
  sortBy: "startAt" | "createdAt" = "startAt";

  /** Sorting direction. */
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  sortOrder: SortOrder = "DESC";
}
