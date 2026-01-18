import { Inject, Logger, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler, EventPublisher } from "@nestjs/cqrs";

import { type IProgressRepository, PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { CompleteBlockSyncCommand } from "../complete-block-sync.command";

@CommandHandler(CompleteBlockSyncCommand)
export class CompleteBlockSyncHandler implements ICommandHandler<CompleteBlockSyncCommand> {
  private readonly logger = new Logger(CompleteBlockSyncHandler.name);

  constructor(
    @Inject(PROGRESS_REPOSITORY)
    private readonly repo: IProgressRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CompleteBlockSyncCommand): Promise<void> {
    const { userId, courseId, blockId, score } = command;

    const progress = await this.repo.findByUserAndCourse(userId, courseId);
    if (!progress) throw new NotFoundException("Progress not found");

    const progressModel = this.publisher.mergeObjectContext(progress);

    progressModel.completeBlockSync(blockId, score);

    await this.repo.save(progressModel);
    progressModel.commit();

    this.logger.log(`Sync completion: User ${userId}, Block ${blockId}, Score ${score}`);
  }
}
