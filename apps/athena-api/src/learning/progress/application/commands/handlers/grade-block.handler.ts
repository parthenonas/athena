import { Inject, Logger, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler, EventPublisher } from "@nestjs/cqrs";

import { type IProgressRepository, PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { GradeBlockCommand } from "../grade-block.command";

@CommandHandler(GradeBlockCommand)
export class GradeBlockHandler implements ICommandHandler<GradeBlockCommand> {
  private readonly logger = new Logger(GradeBlockHandler.name);

  constructor(
    @Inject(PROGRESS_REPOSITORY)
    private readonly repo: IProgressRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: GradeBlockCommand): Promise<void> {
    const { userId, courseId, blockId, score, feedback } = command;

    const progress = await this.repo.findByUserAndCourse(userId, courseId);
    if (!progress) throw new NotFoundException("Progress not found");

    const progressModel = this.publisher.mergeObjectContext(progress);

    progressModel.gradeBlock(blockId, score, feedback);

    await this.repo.save(progressModel);
    progressModel.commit();

    this.logger.log(`Graded block ${blockId} for user ${userId}: Score ${score}`);
  }
}
