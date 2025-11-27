import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Block } from "../../block/entities/block.entity";
import { Course } from "../../course/entities/course.entity";

/**
 * @Entity Lesson
 * A structural unit of a course.
 *
 * Lessons contain:
 * - title
 * - goals / description
 * - order (position inside the course)
 * - draft flag
 * - a tree of blocks (content)
 */
@Entity("lessons")
export class Lesson {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "lessons__id__pk" })
  id!: string;

  /**
   * Parent course.
   */
  @ManyToOne(() => Course, course => course.lessons)
  @JoinColumn({ name: "course_id", foreignKeyConstraintName: "lessons__course_id__fk" })
  course!: Course;

  /**
   * Course ID.
   */
  @Column({ name: "course_id" })
  courseId!: string;

  /**
   * Lesson title.
   */
  @Column()
  title!: string;

  /**
   * Learning goals for this lesson.
   */
  @Column({ type: "text", nullable: true })
  goals!: string | null;

  /**
   * Position inside the course.
   */
  @Column({ type: "int" })
  order!: number;

  /**
   * Whether the lesson is still being edited.
   */
  @Column({ name: "is_draft", default: true })
  isDraft!: boolean;

  /**
   * Content blocks (Notion-style tree).
   */
  @OneToMany(() => Block, block => block.lesson, {
    cascade: ["remove"],
  })
  blocks!: Block[];

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
