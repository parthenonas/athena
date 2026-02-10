import { ExecutionStatus } from "@athena/types";
import { Injectable, Logger } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";

import { AthenaEvent, type SubmissionCompletedEvent } from "../../../shared/events/types";
import { GradeBlockCommand } from "../application/commands/grade-block.command";

/**
 * @class GradingListener
 * @description
 * Listens for asynchronous code execution results and updates student progress.
 *
 * Role:
 * It acts as an Anti-Corruption Layer between the Infrastructure (Runner/SubmissionQueue)
 * and the Domain (StudentProgress). It translates raw execution logs into
 * domain-specific grading commands.
 *
 * Workflow:
 * 1. Listens to `SUBMISSION_COMPLETED` (global event).
 * 2. Filters events: Processes only 'LEARN' context (ignores contests/interviews).
 * 3. Calculates Score: 100 for 'Accepted', 0 for anything else.
 * 4. Formats Feedback: Combines stdout, stderr, and system messages.
 * 5. Dispatches `GradeBlockCommand` to update the aggregate.
 */
@Injectable()
export class GradingListener {
  private readonly logger = new Logger(GradingListener.name);

  constructor(private readonly commandBus: CommandBus) {}

  @OnEvent(AthenaEvent.SUBMISSION_COMPLETED)
  async handleSubmissionResult(event: SubmissionCompletedEvent) {
    const { result } = event;
    const meta = result.metadata;

    if (meta?.context !== "LEARN") {
      return;
    }

    this.logger.log(`[GradingListener] Received result for User: ${meta.userId}, Block: ${meta.blockId}`);

    const score = result.status === ExecutionStatus.Accepted ? 100 : 0;

    let feedback = "";
    if (result.status === ExecutionStatus.SystemError) {
      feedback = `System Error: ${result.message || "Unknown execution environment error"}`;
    } else if (result.stderr) {
      feedback = `Error:\n${result.stderr}`;
    } else {
      feedback = `Output:\n${result.stdout}`;
    }

    await this.commandBus.execute(
      new GradeBlockCommand(meta.userId, meta.courseId, meta.lessonId, meta.blockId, score, feedback),
    );
  }
}
