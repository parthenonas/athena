import { Inject, Logger, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler, EventPublisher } from "@nestjs/cqrs";

import { ContentService } from "../../../../../content";
import { type IProgressRepository, PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { CompleteBlockSyncCommand } from "../complete-block-sync.command";

/**
 * @class CompleteBlockSyncHandler
 * @description
 * Orchestrates the completion of synchronous learning blocks (Video, Text).
 *
 * Workflow:
 * 1. Fetches the aggregate (`StudentProgress`) from the repository.
 * 2. Queries `ContentService` for the latest course structure stats (total blocks/lessons).
 * This ensures that if an instructor added a new block 1 second ago, the progress calculation is accurate.
 * 3. Invokes the domain logic on the aggregate.
 * 4. Persists the updated aggregate and commits domain events.
 */
@CommandHandler(CompleteBlockSyncCommand)
export class CompleteBlockSyncHandler implements ICommandHandler<CompleteBlockSyncCommand> {
  private readonly logger = new Logger(CompleteBlockSyncHandler.name);

  constructor(
    @Inject(PROGRESS_REPOSITORY)
    private readonly repo: IProgressRepository,
    private readonly publisher: EventPublisher,
    private readonly contentService: ContentService,
  ) {}

  async execute(command: CompleteBlockSyncCommand): Promise<void> {
    const { userId, courseId, lessonId, blockId, score } = command;

    const progress = await this.repo.findByUserAndCourse(userId, courseId);
    if (!progress) throw new NotFoundException("Progress not found");

    const { totalBlocksInLesson, totalLessonsInCourse } = await this.contentService.getProgressStats(
      courseId,
      lessonId,
    );

    const progressModel = this.publisher.mergeObjectContext(progress);

    progressModel.completeBlockSync(blockId, lessonId, totalBlocksInLesson, totalLessonsInCourse, score);

    await this.repo.save(progressModel);
    progressModel.commit();

    this.logger.log(`Sync completion: User ${userId}, Block ${blockId}, Score ${score}`);
  }
}
