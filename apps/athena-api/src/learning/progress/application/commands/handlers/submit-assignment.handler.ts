import { Inject, Logger, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler, EventPublisher } from "@nestjs/cqrs";

import { type IProgressRepository, PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { SubmitAssignmentCommand } from "../submit-assignment.command";

/**
 * @class SubmitAssignmentHandler
 * @description
 * Handles the initial submission of an asynchronous task (e.g., Code Challenge).
 *
 * Workflow:
 * 1. Validates the user has an active progress record.
 * 2. Updates the block status to PENDING via the aggregate.
 * 3. Persists the submission payload (code, language) in the aggregate state.
 * 4. Emits `SubmissionReceivedEvent`.
 *
 * Note:
 * This handler DOES NOT grade the assignment. It triggers the event flow
 * that eventually activates the `ProgressSagas` -> `SubmissionQueue`.
 */
@CommandHandler(SubmitAssignmentCommand)
export class SubmitAssignmentHandler implements ICommandHandler<SubmitAssignmentCommand> {
  private readonly logger = new Logger(SubmitAssignmentHandler.name);

  constructor(
    @Inject(PROGRESS_REPOSITORY)
    private readonly repo: IProgressRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: SubmitAssignmentCommand): Promise<void> {
    const { userId, courseId, lessonId, blockId, payload } = command;

    const progress = await this.repo.findByUserAndCourse(userId, courseId);

    if (!progress) {
      throw new NotFoundException("Progress not found. Is user enrolled?");
    }

    this.logger.log(`Async submission received for user ${userId}, block ${blockId}`);

    const progressModel = this.publisher.mergeObjectContext(progress);

    progressModel.submitBlockAsync(blockId, lessonId, payload);

    await this.repo.save(progressModel);

    progressModel.commit();
  }
}
