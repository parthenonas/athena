import { EnrollmentStatus } from "@athena/types";
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
@Entity({ schema: "learning", name: "enrollments" })
@Unique("enrollments__cohort_account__uk", ["cohortId", "accountId"])
@Index("enrollments__account_id__idx", ["accountId"])
export class Enrollment {
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
   * Logical link to the Identity context (Student Account ID).
   */
  @Column({ name: "account_id", type: "uuid" })
  accountId!: string;

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
