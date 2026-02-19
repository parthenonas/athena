import { ProgrammingLanguage, BlockType, BlockRequiredAction } from "./block";

export enum ProgressStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  LOCKED = "LOCKED",
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

export interface BlockProgressState {
  status: GradingStatus;
  score: number;
  feedback?: string;
  submittedAt?: Date;
}

export interface SanitizedBlockView {
  blockId: string;
  type: BlockType;
  orderIndex: number;
  requiredAction: BlockRequiredAction;
  content: Record<string, unknown>;
  progress: BlockProgressState | null;
}

export interface StudentLessonView {
  lessonId: string;
  courseId: string;
  title: string;
  goals?: string | null;
  totalBlocks: number;
  visibleBlocksCount: number;
  blocks: SanitizedBlockView[];
}

export interface StudentDashboardLessonView {
  status: string;
  title: string;
  completedBlocks: Record<string, number>;
}

export interface StudentDashboardView {
  studentId: string;
  courseId: string;
  courseTitle: string;
  courseCoverUrl?: string;
  cohortName: string;
  instructorName: string;
  progressPercentage: number;
  totalScore: number;
  status: ProgressStatus;
  lessons: Record<string, StudentDashboardLessonView>;
  recentBadges: string[];
}
