import { ExecutionStatus } from "@athena/types";
import { Injectable, Logger } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";

import { AthenaEvent, type SubmissionCompletedEvent } from "../../../shared/events/types";
import { GradeBlockCommand } from "../application/commands/grade-block.command";

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
