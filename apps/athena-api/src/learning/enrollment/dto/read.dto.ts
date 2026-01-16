import { EnrollmentResponse, EnrollmentStatus } from "@athena/types";
import { Expose } from "class-transformer";

/**
 * @class ReadEnrollmentDto
 * Safe representation of an Enrollment entity returned to clients.
 */
export class ReadEnrollmentDto implements EnrollmentResponse {
  /** Enrollment UUID. */
  @Expose()
  id!: string;

  /** Cohort UUID. */
  @Expose()
  cohortId!: string;

  /** Student Account UUID. */
  @Expose()
  ownerId!: string;

  /** Current status. */
  @Expose()
  status!: EnrollmentStatus;

  /** Date of enrollment. */
  @Expose()
  enrolledAt!: Date;
}
