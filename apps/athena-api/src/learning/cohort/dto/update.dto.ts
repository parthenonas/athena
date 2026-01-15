import { UpdateCohortRequest } from "@athena/types";
import { Type } from "class-transformer";
import { IsDate, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

/**
 * @class UpdateCohortDto
 * DTO for updating an existing Cohort.
 */
export class UpdateCohortDto implements UpdateCohortRequest {
  /**
   * Updated name.
   */
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  /**
   * Reassign or remove instructor (send null to remove).
   */
  @IsOptional()
  @IsUUID()
  instructorId?: string;

  /**
   * Reassign or remove instructor (send null to remove).
   */
  @IsOptional()
  @IsUUID()
  courseId?: string;

  /**
   * Update start date.
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date | null;

  /**
   * Update end date.
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date | null;
}
