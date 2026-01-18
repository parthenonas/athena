import { GradingStatus } from "@athena/types";
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";

export enum ProgressStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

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

  @Column({ type: "int", default: 0 })
  totalBlocksCompleted: number;

  @Column("jsonb", { default: {} })
  completedBlocks: Record<
    string,
    { score: number; completedAt: Date; status: GradingStatus; submissionData?: unknown; feedback?: string }
  >;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
