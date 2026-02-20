import { ProgressStatus } from "@athena/types";
import { Logger } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { ContentService } from "../../../../../content/content.service";
import { LessonCompletedEvent } from "../../../domain/events/lesson-completed.event";
import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";

@EventsHandler(LessonCompletedEvent)
export class LessonCompletedHandler implements IEventHandler<LessonCompletedEvent> {
  private readonly logger = new Logger(LessonCompletedHandler.name);

  constructor(
    @InjectModel(StudentDashboard.name)
    private readonly dashboardModel: Model<StudentDashboard>,
    private readonly contentService: ContentService,
  ) {}

  async handle(event: LessonCompletedEvent) {
    this.logger.log(`Lesson ${event.lessonId} completed by ${event.studentId}. Unlocking next lesson...`);

    const lessons = await this.contentService.getLessonsByCourseId(event.courseId);
    const sortedLessons = lessons.sort((a, b) => a.order - b.order);

    const currentIndex = sortedLessons.findIndex(l => l.id === event.lessonId);

    if (currentIndex !== -1 && currentIndex + 1 < sortedLessons.length) {
      const nextLesson = sortedLessons[currentIndex + 1];

      this.logger.log(`Unlocking next lesson: ${nextLesson.id} for user ${event.studentId}`);

      await this.dashboardModel.updateOne(
        { studentId: event.studentId, courseId: event.courseId },
        {
          $set: {
            [`lessons.${nextLesson.id}.status`]: ProgressStatus.IN_PROGRESS,
            updatedAt: new Date(),
          },
        },
      );
    } else {
      this.logger.log(`Course ${event.courseId} fully completed by ${event.studentId}. No more lessons to unlock.`);
    }
  }
}
