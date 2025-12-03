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
 * Represents a structural unit (chapter) within a Course.
 *
 * A Lesson serves as a container for content Blocks and holds metadata:
 * - Title and learning goals.
 * - Order/Position within the parent Course.
 * - Publication status (Draft).
 */
@Entity("lessons")
export class Lesson {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "lessons__id__pk" })
  id!: string;

  /**
   * Reference to the parent Course.
   * If the Course is deleted, all associated Lessons are removed (Cascade).
   */
  @ManyToOne(() => Course, course => course.lessons, { onDelete: "CASCADE" })
  @JoinColumn({ name: "course_id", foreignKeyConstraintName: "lessons__course_id__fk" })
  course!: Course;

  /**
   * Foreign Key for the Course.
   */
  @Column({ name: "course_id" })
  courseId!: string;

  /**
   * Human-readable title of the lesson.
   */
  @Column()
  title!: string;

  /**
   * Optional description or learning objectives for this lesson.
   */
  @Column({ type: "text", nullable: true })
  goals!: string | null;

  /**
   * Sequential index determining the lesson's position in the course.
   * Lower values appear first.
   */
  @Column({ type: "int" })
  order!: number;

  /**
   * Indicates whether the lesson is a draft (invisible to students).
   * Defaults to true.
   */
  @Column({ name: "is_draft", default: true })
  isDraft!: boolean;

  /**
   * Collection of content blocks (Text, Video, Code, etc.) belonging to this lesson.
   */
  @OneToMany(() => Block, block => block.lesson, {
    cascade: ["remove"],
  })
  blocks!: Block[];

  /**
   * Timestamp of creation.
   */
  @CreateDateColumn({ name: "created_at" })
  readonly createdAt!: Date;

  /**
   * Timestamp of the last update.
   */
  @UpdateDateColumn({ name: "updated_at" })
  readonly updatedAt!: Date;

  /**
   * Timestamp of soft deletion.
   */
  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt!: Date | null;
}
