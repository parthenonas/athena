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

    if (!enrollment || !course) {
      this.logger.error(`Data mismatch for projection: ${event.progressId}`);
      return;
    }

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
          lessons: {},
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}
