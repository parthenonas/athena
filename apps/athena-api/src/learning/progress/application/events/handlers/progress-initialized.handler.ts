import { ProgressStatus, StudentDashboardLessonView } from "@athena/types";
import { Logger } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { InjectRepository } from "@nestjs/typeorm";
import { Model } from "mongoose";
import { Repository } from "typeorm";

import { ContentService } from "../../../../../content/content.service";
import { Enrollment } from "../../../../enrollment/entities/enrollment.entity";
import { ProgressInitializedEvent } from "../../../domain/events/progress-initialized.event";
import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";

/**
 * @class ProgressInitializedHandler
 * @description
 * Creates (or updates) the `StudentDashboard` Read Model when a student starts a course.
 *
 * Responsibilities:
 * - Data Aggregation: Fetches Course metadata (title) and Enrollment details (Cohort, Instructor).
 * - Denormalization: Flattens relational data into a single MongoDB document for fast read access.
 * - Upsert: Ensures the dashboard record exists using `upsert: true`.
 *
 * Why this matters:
 * This handler prepares the "landing page" for the student. It ensures that even if
 * the student hasn't completed any lessons yet, they see the Course Title, Cohort Name,
 * and Instructor immediately.
 */
@EventsHandler(ProgressInitializedEvent)
export class ProgressInitializedHandler implements IEventHandler<ProgressInitializedEvent> {
  private readonly logger = new Logger(ProgressInitializedHandler.name);

  constructor(
    @InjectModel(StudentDashboard.name)
    private readonly dashboardModel: Model<StudentDashboard>,
    private readonly contentService: ContentService,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
  ) {}

  async handle(event: ProgressInitializedEvent) {
    this.logger.log(`Projecting Read Model for progress: ${event.progressId}`);

    const course = await this.contentService.getCourseById(event.courseId, event.studentId);

    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: event.enrollmentId },
      relations: ["cohort", "cohort.instructor"],
    });

    const lessons = await this.contentService.getLessonsByCourseId(event.courseId);

    if (!enrollment || !course) {
      this.logger.error(`Data mismatch for projection: ${event.progressId}. Missing Course or Enrollment.`);
      return;
    }

    const sortedLessons = lessons.sort((a, b) => a.order - b.order);

    const lessonsProjection: Record<string, StudentDashboardLessonView> = {};
    sortedLessons.forEach((lesson, index) => {
      lessonsProjection[lesson.id] = {
        title: lesson.title,
        status: index === 0 ? ProgressStatus.IN_PROGRESS : ProgressStatus.LOCKED,
        completedBlocks: {},
      };
    });

    const instructorName = enrollment.cohort.instructor?.title
      ? `${enrollment.cohort.instructor.title} ${enrollment.cohort.instructor.ownerId}`
      : "Unknown Instructor";

    await this.dashboardModel.updateOne(
      { studentId: event.studentId, courseId: event.courseId },
      {
        $set: {
          courseTitle: course.title,
          cohortName: enrollment.cohort.name,
          instructorName: instructorName,

          progressPercentage: 0,
          totalScore: 0,
          updatedAt: new Date(),
        },

        $setOnInsert: {
          lessons: lessonsProjection,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}
