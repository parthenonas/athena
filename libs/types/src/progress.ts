import { ProgrammingLanguage } from "./block";

export enum ProgressStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export enum GradingStatus {
  PENDING = "PENDING",
  GRADED = "GRADED",
  FAILED = "FAILED",
}

export interface StudentSubmissionRequest {
  code: string;
  language: ProgrammingLanguage;
  socketId: string;
}

export interface BaseBlockResult {
  score: number;
  completedAt: Date;
  status: GradingStatus;
  submissionData?: unknown;
  feedback?: string;
}

export interface StudentLessonProgress {
  status: ProgressStatus;
  completedBlocks: Record<string, BaseBlockResult>;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentCourseProgress {
  id: string;
  enrollmentId: string;
  courseId: string;
  studentId: string;
  status: ProgressStatus;
  lessons: Record<string, StudentLessonProgress>;
  currentScore: number;
  createdAt: Date;
  updatedAt: Date;
}
