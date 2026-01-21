import { ProgressStatus, StudentLessonProgress } from "@athena/types";
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";

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

  @Column("jsonb", { default: {} })
  lessons: Record<string, StudentLessonProgress>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
