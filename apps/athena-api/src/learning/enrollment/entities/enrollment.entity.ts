import { EnrollmentStatus, Ownable } from "@athena/types";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { Cohort } from "../../cohort/entities/cohort.entity";

/**
 * @Entity Enrollment
 * Represents the link between a student (Account) and a Cohort.
 * Tracks the status of the student within the group.
 */
@Entity({ name: "enrollments" })
@Unique("enrollments__cohort_owner__uk", ["cohortId", "ownerId"])
@Index("enrollments__owner_id__idx", ["ownerId"])
export class Enrollment implements Ownable {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "enrollments__id__pk" })
  id!: string;

  /**
   * ID of the cohort.
   */
  @Column({ name: "cohort_id", type: "uuid" })
  cohortId!: string;

  /**
   * The cohort the student is enrolled in.
   */
  @ManyToOne(() => Cohort, cohort => cohort.enrollments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cohort_id", foreignKeyConstraintName: "enrollments__cohort_id__fk" })
  cohort!: Cohort;

  /**
   * Student Account ID.
   * Implements Ownable.ownerId.
   */
  @Column({ name: "owner_id", type: "uuid" })
  ownerId!: string;

  /**
   * Current status of the enrollment (Active, Expelled, etc.).
   */
  @Column({ type: "varchar", enum: EnrollmentStatus, default: EnrollmentStatus.Active })
  status!: EnrollmentStatus;

  /**
   * The date when the student joined the cohort.
   */
  @CreateDateColumn({ name: "enrolled_at" })
  readonly enrolledAt!: Date;
}
