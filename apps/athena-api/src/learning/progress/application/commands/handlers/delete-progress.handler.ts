import { Inject, Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { type IProgressRepository, PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";
import { DeleteProgressCommand } from "../delete-progress.command";

/**
 * @class DeleteProgressHandler
 * @description
 * Deletes existing student progress.
 *
 * Triggered by:
 * - EnrollmentDeletedEvent
 */
@CommandHandler(DeleteProgressCommand)
export class DeleteProgressHandler implements ICommandHandler<DeleteProgressCommand> {
  private readonly logger = new Logger(DeleteProgressCommand.name);

  constructor(
    @Inject(PROGRESS_REPOSITORY)
    private readonly repo: IProgressRepository,
    @InjectModel(StudentDashboard.name)
    private readonly dashboardModel: Model<StudentDashboard>,
  ) {}

  async execute(command: DeleteProgressCommand): Promise<void> {
    const { enrollmentId, courseId, studentId } = command;

    this.logger.log(`Initializing progress for enrollment ${enrollmentId}`);

    await this.repo.deleteByEnrollmentId(enrollmentId);

    await this.dashboardModel.deleteOne({
      studentId,
      courseId,
    });

    this.logger.log(`Cleanup complete for user ${studentId} on course ${courseId}`);
  }
}
