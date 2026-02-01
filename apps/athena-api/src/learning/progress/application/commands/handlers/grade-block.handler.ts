import { Inject, Logger, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler, EventPublisher } from "@nestjs/cqrs";

import { ContentService } from "../../../../../content";
import { type IProgressRepository, PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { GradeBlockCommand } from "../grade-block.command";

/**
 * @class GradeBlockHandler
 * @description
 * Processes the result of an asynchronous code submission.
 * This handler is typically triggered by a System Listener (Saga/Queue Consumer)
 * when the Code Runner returns a verdict.
 *
 * Workflow:
 * 1. Retrieves the student's progress.
 * 2. Fetches fresh course statistics (to know if this block completes the lesson/course).
 * 3. Applies the grading logic (Score + Feedback) to the aggregate.
 * 4. Persists the state and triggers domain events (e.g., BlockCompletedEvent).
 */
@CommandHandler(GradeBlockCommand)
export class GradeBlockHandler implements ICommandHandler<GradeBlockCommand> {
  private readonly logger = new Logger(GradeBlockHandler.name);

  constructor(
    @Inject(PROGRESS_REPOSITORY)
    private readonly repo: IProgressRepository,
    private readonly publisher: EventPublisher,
    private readonly contentService: ContentService,
  ) {}

  async execute(command: GradeBlockCommand): Promise<void> {
    const { userId, courseId, lessonId, blockId, score, feedback } = command;

    const progress = await this.repo.findByUserAndCourse(userId, courseId);
    if (!progress) throw new NotFoundException("Progress not found");

    const { totalBlocksInLesson, totalLessonsInCourse } = await this.contentService.getProgressStats(
      courseId,
      lessonId,
    );

    const progressModel = this.publisher.mergeObjectContext(progress);

    progressModel.gradeBlock(blockId, lessonId, totalBlocksInLesson, totalLessonsInCourse, score, feedback);

    await this.repo.save(progressModel);
    progressModel.commit();

    this.logger.log(`Graded block ${blockId} for user ${userId}: Score ${score}`);
  }
}
