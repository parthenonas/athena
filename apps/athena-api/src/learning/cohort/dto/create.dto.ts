import { CreateCohortRequest } from "@athena/types";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

/**
 * @class CreateCohortDto
 * DTO for creating a new study Cohort.
 */
export class CreateCohortDto implements CreateCohortRequest {
  /**
   * Human-readable name of the cohort (e.g. "CS-2024-A").
   */
  @IsString()
  @MinLength(2)
  name!: string;

  /**
   * UUID of the assigned Instructor.
   */
  @IsNotEmpty()
  @IsUUID()
  instructorId: string;

  /**
   * UUID of the assigned Course.
   */
  @IsNotEmpty()
  @IsUUID()
  courseId: string;

  /**
   * Start date of the learning process.
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  /**
   * End date of the learning process.
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
