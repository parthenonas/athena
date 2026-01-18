import { Inject, Logger, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler, EventPublisher } from "@nestjs/cqrs";

import { type IProgressRepository, PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { SubmitAssignmentCommand } from "../submit-assignment.command";

@CommandHandler(SubmitAssignmentCommand)
export class SubmitAssignmentHandler implements ICommandHandler<SubmitAssignmentCommand> {
  private readonly logger = new Logger(SubmitAssignmentHandler.name);

  constructor(
    @Inject(PROGRESS_REPOSITORY)
    private readonly repo: IProgressRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: SubmitAssignmentCommand): Promise<void> {
    const { userId, courseId, blockId, payload } = command;

    const progress = await this.repo.findByUserAndCourse(userId, courseId);

    if (!progress) {
      throw new NotFoundException("Progress not found. Is user enrolled?");
    }

    this.logger.log(`Async submission received for user ${userId}, block ${blockId}`);

    const progressModel = this.publisher.mergeObjectContext(progress);

    progressModel.submitBlockAsync(blockId, payload);

    await this.repo.save(progressModel);

    progressModel.commit();
  }
}
