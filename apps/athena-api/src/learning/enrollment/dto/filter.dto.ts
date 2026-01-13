import { EnrollmentStatus, FilterEnrollmentRequest, type SortOrder } from "@athena/types";
import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

/**
 * @class FilterEnrollmentDto
 * DTO for listing enrollments.
 * Allows filtering by cohort, student, or status.
 */
export class FilterEnrollmentDto implements FilterEnrollmentRequest {
  /** Filter by specific cohort. */
  @IsOptional()
  @IsUUID()
  cohortId?: string;

  /** Filter by specific student. */
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  /** Filter by status. */
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

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
  @IsIn(["enrolledAt", "status"])
  sortBy: "enrolledAt" | "status" = "enrolledAt";

  /** Sorting direction. */
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  sortOrder: SortOrder = "DESC";
}
