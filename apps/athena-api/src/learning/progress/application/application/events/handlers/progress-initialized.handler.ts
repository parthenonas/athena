import { Logger } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { ProgressInitializedEvent } from "../../../../domain/events/progress-initialized.event";
import { StudentDashboard } from "../../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";

@EventsHandler(ProgressInitializedEvent)
export class ProgressInitializedHandler implements IEventHandler<ProgressInitializedEvent> {
  private readonly logger = new Logger(ProgressInitializedHandler.name);

  constructor(
    @InjectModel(StudentDashboard.name)
    private readonly dashboardModel: Model<StudentDashboard>,
  ) {}

  async handle(event: ProgressInitializedEvent) {
    this.logger.log(`Projecting Read Model for progress: ${event.progressId}`);

    await this.dashboardModel.updateOne(
      { studentId: event.studentId, courseId: event.courseId },
      {
        $set: {
          progressPercentage: 0,
          totalScore: 0,
          recentBadges: [],
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}
