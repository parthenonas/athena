import { EnrollmentStatus, UpdateEnrollmentRequest } from "@athena/types";
import { IsEnum, IsOptional } from "class-validator";

/**
 * @class UpdateEnrollmentDto
 * DTO for updating enrollment status.
 * Used to expel students or mark them as completed.
 */
export class UpdateEnrollmentDto implements UpdateEnrollmentRequest {
  /**
   * New status.
   */
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
