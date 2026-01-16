import { Inject, Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler, EventPublisher } from "@nestjs/cqrs";
import { v4 as uuid } from "uuid";

import { type IProgressRepository, PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { StudentProgress } from "../../../domain/student-progress.model";
import { InitializeProgressCommand } from "../initialize-progress.command";

@CommandHandler(InitializeProgressCommand)
export class InitializeProgressHandler implements ICommandHandler<InitializeProgressCommand> {
  private readonly logger = new Logger(InitializeProgressHandler.name);

  constructor(
    @Inject(PROGRESS_REPOSITORY)
    private readonly repo: IProgressRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: InitializeProgressCommand): Promise<void> {
    const { enrollmentId, courseId, studentId } = command;

    this.logger.log(`Initializing progress for enrollment ${enrollmentId}`);

    const existing = await this.repo.findByEnrollmentId(enrollmentId);
    if (existing) {
      this.logger.warn(`Progress for enrollment ${enrollmentId} already exists. Skipping.`);
      return;
    }

    const newProgressId = uuid();
    const progress = StudentProgress.create(newProgressId, enrollmentId, courseId, studentId);

    const progressModel = this.publisher.mergeObjectContext(progress);

    await this.repo.save(progress);

    progressModel.commit();

    this.logger.log(`Progress initialized: ${newProgressId}`);
  }
}
