import { type ScheduleConfigOverrides, UpdateScheduleRequest } from "@athena/types";
import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsObject, IsOptional } from "class-validator";

/**
 * @class UpdateScheduleDto
 * DTO for updating lesson availability and rules.
 */
export class UpdateScheduleDto implements UpdateScheduleRequest {
  /**
   * Update start time.
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date | null;

  /**
   * Update end time.
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date | null;

  /**
   * Toggle manual access.
   */
  @IsOptional()
  @IsBoolean()
  isOpenManually?: boolean;

  /**
   * Update block overrides.
   * Note: This usually replaces the entire JSON object.
   */
  @IsOptional()
  @IsObject()
  configOverrides?: ScheduleConfigOverrides;
}
