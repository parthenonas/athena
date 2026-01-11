import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

import { Cohort } from "../../cohort/entities/cohort.entity";

/**
 * @Entity Instructor
 * Represents a teacher profile linked to a system account.
 * Stores academic information and biography.
 */
@Entity({ schema: "learning", name: "instructors" })
@Unique("instructors__account_id__uk", ["accountId"])
export class Instructor {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "instructors__id__pk" })
  id!: string;

  /**
   * Logical link to the Identity context (Account ID).
   * One account can have only one instructor profile.
   */
  @Column({ name: "account_id", type: "uuid" })
  accountId!: string;

  /**
   * Instructor's biography or introduction.
   */
  @Column({ type: "text", nullable: true })
  bio!: string | null;

  /**
   * Academic title or position (e.g., "Senior Lecturer", "Professor").
   */
  @Column({ type: "varchar", nullable: true })
  title!: string | null;

  /**
   * List of cohorts supervised by this instructor.
   */
  @OneToMany(() => Cohort, cohort => cohort.instructor)
  cohorts!: Cohort[];

  /**
   * Timestamps.
   */
  @CreateDateColumn({ name: "created_at" })
  readonly createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  readonly updatedAt!: Date;
}
