import { ProgressStatus } from "@athena/types";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type StudentDashboardDocument = HydratedDocument<StudentDashboard>;

/**
 * Nested schema for lesson summary in dashboard.
 */
export class DashboardLessonData {
  status!: string;
  title!: string;
  completedBlocks!: Record<string, number>;
}

/**
 * @Schema StudentDashboard
 * @description
 * The Read Model for the student's dashboard.
 * Designed for HIGH PERFORMANCE READS (O(1)).
 *
 * Characteristics:
 * - Denormalized: Contains copies of Course Title, Instructor Name, etc.
 * - Optimized: No joins required to render the "My Courses" page.
 */
@Schema({ collection: "student_dashboards", timestamps: true })
export class StudentDashboard {
  @Prop({ required: true, index: true })
  studentId!: string;

  @Prop({ required: true })
  courseId!: string;

  @Prop({ required: true })
  courseTitle!: string;

  @Prop({ required: false })
  courseCoverUrl?: string;

  @Prop({ required: true })
  cohortName!: string;

  @Prop({ required: true })
  instructorName!: string;

  @Prop({ default: 0 })
  progressPercentage!: number;

  @Prop({ default: 0 })
  totalScore!: number;

  @Prop({ type: String, enum: ProgressStatus, default: ProgressStatus.IN_PROGRESS })
  status!: ProgressStatus;

  /**
   * Flat map of lesson statuses.
   * Allows the frontend to render the course map quickly.
   */
  @Prop({ type: Object, default: {} })
  lessons!: Record<string, DashboardLessonData>;

  @Prop([String])
  recentBadges!: string[];
}

export const StudentDashboardSchema = SchemaFactory.createForClass(StudentDashboard);

StudentDashboardSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
