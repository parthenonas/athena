import { CreateScheduleRequest, type ScheduleConfigOverrides } from "@athena/types";
import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsObject, IsOptional, IsUUID } from "class-validator";

/**
 * @class CreateScheduleDto
 * DTO for scheduling a lesson for a cohort.
 */
export class CreateScheduleDto implements CreateScheduleRequest {
  /**
   * Target Cohort UUID.
   */
  @IsUUID()
  cohortId!: string;

  /**
   * Content Lesson UUID.
   */
  @IsUUID()
  lessonId!: string;

  /**
   * Access start time.
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date | null;

  /**
   * Access end time (deadline).
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date | null;

  /**
   * Manual override flag to open access immediately.
   */
  @IsOptional()
  @IsBoolean()
  isOpenManually?: boolean = false;

  /**
   * Specific block requirement overrides for this group.
   * Expects a JSON object: { [blockId]: "view" | "submit" ... }
   */
  @IsOptional()
  @IsObject()
  configOverrides?: ScheduleConfigOverrides = {};
}
