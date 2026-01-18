import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type StudentDashboardDocument = HydratedDocument<StudentDashboard>;

@Schema({ collection: "student_dashboards", timestamps: true })
export class StudentDashboard {
  @Prop({ required: true, index: true })
  studentId: string;

  @Prop({ required: true })
  courseId: string;

  @Prop({ required: true })
  courseTitle: string;

  @Prop({ required: false })
  courseCoverUrl?: string;

  @Prop({ required: true })
  cohortName: string;

  @Prop({ required: true })
  instructorName: string;

  @Prop({ default: 0 })
  progressPercentage: number;

  @Prop({ default: 0 })
  totalScore: number;

  @Prop({ type: Object, default: {} })
  completedBlocks: Record<string, number>;

  @Prop([String])
  recentBadges: string[];
}

export const StudentDashboardSchema = SchemaFactory.createForClass(StudentDashboard);
StudentDashboardSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
