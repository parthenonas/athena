import { CohortResponse } from "@athena/types";
import { Expose } from "class-transformer";

/**
 * @class ReadCohortDto
 * Safe representation of a Cohort entity returned to clients.
 */
export class ReadCohortDto implements CohortResponse {
  /** Cohort UUID. */
  @Expose()
  id!: string;

  /** Display name. */
  @Expose()
  name!: string;

  /** ID of the assigned instructor. */
  @Expose()
  instructorId!: string;

  /** ID of the assigned course. */
  @Expose()
  courseId!: string;

  /** Start of the semester/course. */
  @Expose()
  startDate!: Date | null;

  /** End of the semester/course. */
  @Expose()
  endDate!: Date | null;

  /** Creation timestamp. */
  @Expose()
  createdAt!: Date;

  /** Update timestamp. */
  @Expose()
  updatedAt!: Date;
}
