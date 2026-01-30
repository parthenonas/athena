import { ProgressStatus, StudentLessonProgress } from "@athena/types";
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";

/**
 * @Entity ProgressOrmEntity
 * @description
 * The SQL representation of the StudentProgress aggregate.
 *
 * Storage Strategy:
 * - Hybrid Relational/Document approach.
 * - Key identifiers (IDs, Status, Score) are columns for fast indexing/querying.
 * - Detailed lesson data is stored as `jsonb` to handle dynamic course structures without complex joins.
 */
@Entity("student_progress")
@Unique(["enrollmentId", "courseId"])
export class ProgressOrmEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  enrollmentId: string;

  @Column("uuid")
  courseId: string;

  @Column("uuid")
  studentId: string;

  @Column({
    type: "enum",
    enum: ProgressStatus,
    default: ProgressStatus.NOT_STARTED,
  })
  status: ProgressStatus;

  @Column({ type: "int", default: 0 })
  currentScore: number;

  /**
   * Stores the nested map of lessons and blocks.
   * Mapped via ProgressMapper to domain objects.
   */
  @Column("jsonb", { default: {} })
  lessons: Record<string, StudentLessonProgress>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
