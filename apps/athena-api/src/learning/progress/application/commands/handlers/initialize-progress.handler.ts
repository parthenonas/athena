import { Inject, Logger } from "@nestjs/common";
import { CommandHandler, ICommandHandler, EventPublisher } from "@nestjs/cqrs";
import { v4 as uuid } from "uuid";

import { type IProgressRepository, PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { StudentProgress } from "../../../domain/student-progress.model";
import { InitializeProgressCommand } from "../initialize-progress.command";

/**
 * @class InitializeProgressHandler
 * @description
 * Creates the initial tracking record for a student when they enroll in a course.
 *
 * Triggered by:
 * - EnrollmentCreatedEvent (via Saga or Event Listener)
 *
 * Responsibilities:
 * - Idempotency: Checks if progress already exists to prevent duplicates.
 * - Aggregate Creation: Instantiates a new StudentProgress aggregate.
 * - Event Publication: Commits the 'ProgressInitializedEvent'.
 */
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

    await this.repo.save(progressModel);
    progressModel.commit();

    this.logger.log(`Progress initialized: ${newProgressId}`);
  }
}
