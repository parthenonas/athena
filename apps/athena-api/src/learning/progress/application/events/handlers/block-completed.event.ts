import { Logger } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { BlockCompletedEvent } from "../../../domain/events/block-completed.event";
import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";

@EventsHandler(BlockCompletedEvent)
export class BlockCompletedHandler implements IEventHandler<BlockCompletedEvent> {
  private readonly logger = new Logger(BlockCompletedHandler.name);

  constructor(
    @InjectModel(StudentDashboard.name)
    private readonly dashboardModel: Model<StudentDashboard>,
  ) {}

  async handle(event: BlockCompletedEvent) {
    this.logger.log(`Projecting Block Completion to Mongo: User ${event.studentId}, Block ${event.blockId}`);

    await this.dashboardModel.updateOne(
      { studentId: event.studentId, courseId: event.courseId },
      {
        $inc: { totalScore: event.score },
        $set: { [`completedBlocks.${event.blockId}`]: event.score, updatedAt: new Date() },
      },
    );
  }
}
