import { type ScheduleConfigOverrides, ScheduleResponse } from "@athena/types";
import { Expose } from "class-transformer";

/**
 * @class ReadScheduleDto
 * Safe representation of a Schedule entity.
 */
export class ReadScheduleDto implements ScheduleResponse {
  /** Schedule UUID. */
  @Expose()
  id!: string;

  /** Cohort UUID. */
  @Expose()
  cohortId!: string;

  /** Lesson UUID. */
  @Expose()
  lessonId!: string;

  /** Start timestamp. */
  @Expose()
  startAt!: Date | null;

  /** End timestamp. */
  @Expose()
  endAt!: Date | null;

  /** Manual access flag. */
  @Expose()
  isOpenManually!: boolean;

  /** JSON configuration for overrides. */
  @Expose()
  configOverrides!: ScheduleConfigOverrides;

  /** Creation timestamp. */
  @Expose()
  createdAt!: Date;

  /** Update timestamp. */
  @Expose()
  updatedAt!: Date;
}
