import { type ScheduleConfigOverrides } from "@athena/types";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

import { Cohort } from "../../cohort/entities/cohort.entity";

/**
 * @Entity Schedule
 * Connects a specific Lesson (from Content context) to a Cohort (from Learning context).
 * Defines availability windows and custom logic overrides.
 */
@Entity({ schema: "learning", name: "schedules" })
@Unique("schedules__cohort_lesson__uk", ["cohortId", "lessonId"])
export class Schedule {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "schedules__id__pk" })
  id!: string;

  /**
   * ID of the cohort.
   */
  @Column({ name: "cohort_id", type: "uuid" })
  cohortId!: string;

  /**
   * The cohort this schedule belongs to.
   */
  @ManyToOne(() => Cohort, cohort => cohort.schedules, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cohort_id", foreignKeyConstraintName: "schedules__cohort_id__fk" })
  cohort!: Cohort;

  /**
   * Logical link to the Content context (Lesson ID).
   */
  @Column({ name: "lesson_id", type: "uuid" })
  lessonId!: string;

  /**
   * The timestamp when the lesson becomes available to students.
   */
  @Column({ name: "start_at", type: "timestamp", nullable: true })
  startAt!: Date | null;

  /**
   * The timestamp when the lesson becomes unavailable (deadline).
   */
  @Column({ name: "end_at", type: "timestamp", nullable: true })
  endAt!: Date | null;

  /**
   * Manual override to open the lesson regardless of the schedule dates.
   */
  @Column({ name: "is_open_manually", type: "boolean", default: false })
  isOpenManually!: boolean;

  /**
   * JSON configuration to override block behaviors for this specific group.
   * Example: { "block-uuid": "view" } to relax requirements.
   */
  @Column({ name: "config_overrides", type: "jsonb", default: {} })
  configOverrides!: ScheduleConfigOverrides;

  /**
   * Timestamps.
   */
  @CreateDateColumn({ name: "created_at" })
  readonly createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  readonly updatedAt!: Date;
}
