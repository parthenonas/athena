import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

import { Lesson } from "../../lesson/entities/lesson.entity";

/**
 * @Entity Course
 * Represents a top-level learning unit.
 *
 * A course contains metadata only:
 * - title, description
 * - author
 * - publication status
 * Lessons and blocks are stored separately.
 */
@Entity("courses")
@Unique("courses__title__uk", ["title"])
export class Course {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "courses__id__pk" })
  id!: string;

  /**
   * Human-readable course title.
   */
  @Column()
  title!: string;

  /**
   * Short course description or annotation.
   */
  @Column({ type: "text", nullable: true })
  description!: string | null;

  /**
   * Author of the course (Account.id).
   */
  @Column({ name: "owner_id" })
  ownerId!: string;

  /**
   * Optional tags for search and filtering.
   */
  @Column({ type: "text", array: true, default: () => "array[]::text[]" })
  tags!: string[];

  /**
   * Whether the course is visible to end users.
   */
  @Column({ name: "is_published", default: false })
  isPublished!: boolean;

  /**
   * List of lessons belonging to this course.
   */
  @OneToMany(() => Lesson, lesson => lesson.course, {
    cascade: ["remove"],
  })
  lessons!: Lesson[];

  /**
   * Timestamps.
   */
  @CreateDateColumn({ name: "created_at" })
  readonly createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  readonly updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt!: Date | null;
}
