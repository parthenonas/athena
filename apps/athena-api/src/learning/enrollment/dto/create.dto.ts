import { CreateEnrollmentRequest, EnrollmentStatus } from "@athena/types";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

/**
 * @class CreateEnrollmentDto
 * DTO for enrolling a student into a cohort.
 */
export class CreateEnrollmentDto implements CreateEnrollmentRequest {
  /**
   * Target Cohort UUID.
   */
  @IsUUID()
  cohortId!: string;

  /**
   * Student Account UUID.
   */
  @IsUUID()
  accountId!: string;

  /**
   * Initial status (default: Active).
   */
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus = EnrollmentStatus.Active;
}
