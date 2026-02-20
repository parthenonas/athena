import { ProgressStatus, StudentDashboardLessonView, StudentDashboardView } from "@athena/types";
import { Expose, Type } from "class-transformer";

/**
 * @class StudentDashboardLessonViewDto
 * @description
 * Represents the progress status and results for a single lesson within the dashboard view.
 */
export class StudentDashboardLessonViewDto implements StudentDashboardLessonView {
  /**
   * The current status of the lesson (e.g., "LOCKED", "IN_PROGRESS", "COMPLETED").
   */
  @Expose()
  status!: ProgressStatus;

  /**
   * The title of the lesson.
   */
  @Expose()
  title!: string;

  /**
   * A map of completed blocks where the key is the blockId and the value is the achieved score.
   */
  @Expose()
  completedBlocks!: Record<string, number>;
}

/**
 * @class StudentDashboardViewDto
 * @description
 * Data Transfer Object for the student's course card on the dashboard.
 * Provides a high-level overview of progress, instructor info, and lesson states.
 */
export class StudentDashboardViewDto implements StudentDashboardView {
  /**
   * Unique identifier of the student.
   */
  @Expose()
  studentId!: string;

  /**
   * Unique identifier of the course.
   */
  @Expose()
  courseId!: string;

  /**
   * Human-readable title of the course.
   */
  @Expose()
  courseTitle!: string;

  /**
   * Optional URL for the course cover image.
   */
  @Expose()
  courseCoverUrl?: string;

  /**
   * Name of the academic cohort/group.
   */
  @Expose()
  cohortName!: string;

  /**
   * Full name of the assigned instructor.
   */
  @Expose()
  instructorName!: string;

  /**
   * Course completion progress in percentage (0-100).
   */
  @Expose()
  progressPercentage!: number;

  /**
   * Total cumulative score earned in the course.
   */
  @Expose()
  totalScore!: number;

  /**
   * Overall student status in the course.
   */
  @Expose()
  status!: ProgressStatus;

  /**
   * Map of lesson progress details.
   * Key is the lessonId, value is the lesson progress state.
   */
  @Expose()
  @Type(() => StudentDashboardLessonViewDto)
  lessons!: Record<string, StudentDashboardLessonViewDto>;

  /**
   * List of recently earned badges or achievements.
   */
  @Expose()
  recentBadges!: string[];
}
