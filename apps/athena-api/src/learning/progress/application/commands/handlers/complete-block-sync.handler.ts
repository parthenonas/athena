import { Inject, Logger, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler, EventPublisher } from "@nestjs/cqrs";

import { ContentService } from "../../../../../content";
import { type IProgressRepository, PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { CompleteBlockSyncCommand } from "../complete-block-sync.command";

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
