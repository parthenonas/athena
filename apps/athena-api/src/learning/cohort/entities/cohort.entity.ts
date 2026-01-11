import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Enrollment } from "../../enrollment/entities/enrollment.entity";
import { Instructor } from "../../instructor/entities/instructor.entity";
import { Schedule } from "../../schedule/entities/schedule.entity";

/**
 * @Entity Cohort
 * Represents a group of students studying together (e.g., "CS-2024-A").
 * A cohort has a designated instructor and a specific timeline.
 */
@Entity({ schema: "learning", name: "cohorts" })
export class Cohort {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "cohorts__id__pk" })
  id!: string;

  /**
   * The display name of the cohort.
   */
  @Column({ type: "varchar" })
  name!: string;

  /**
   * ID of the assigned instructor.
   */
  @Column({ name: "instructor_id", type: "uuid", nullable: true })
  instructorId!: string | null;

  /**
   * The instructor assigned to supervise this cohort.
   */
  @ManyToOne(() => Instructor, instructor => instructor.cohorts, { onDelete: "SET NULL" })
  @JoinColumn({ name: "instructor_id", foreignKeyConstraintName: "cohorts__instructor_id__fk" })
  instructor!: Instructor | null;

  /**
   * The date when the learning process begins for this cohort.
   */
  @Column({ name: "start_date", type: "timestamp", nullable: true })
  startDate!: Date | null;

  /**
   * The date when the learning process ends.
   */
  @Column({ name: "end_date", type: "timestamp", nullable: true })
  endDate!: Date | null;

  /**
   * List of student enrollments in this cohort.
   */
  @OneToMany(() => Enrollment, enrollment => enrollment.cohort)
  enrollments!: Enrollment[];

  /**
   * The schedule of lessons assigned to this cohort.
   */
  @OneToMany(() => Schedule, schedule => schedule.cohort)
  schedules!: Schedule[];

  /**
   * Timestamps.
   */
  @CreateDateColumn({ name: "created_at" })
  readonly createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  readonly updatedAt!: Date;
}
