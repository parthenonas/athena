import { Ownable } from "@athena/types";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

import { Cohort } from "../../cohort/entities/cohort.entity";

/**
 * @Entity Instructor
 * Represents a teacher profile linked to a system account.
 * Stores academic information and biography.
 */
@Entity({ schema: "learning", name: "instructors" })
@Unique("instructors__owner_id__uk", ["ownerId"])
export class Instructor implements Ownable {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "instructors__id__pk" })
  id!: string;

  /**
   * Reference to the Account ID (Identity context).
   * Renamed from accountId to ownerId to satisfy Ownable interface.
   */
  @Column({ name: "owner_id", type: "uuid" })
  ownerId!: string;

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
