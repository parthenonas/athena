import { Injectable, Logger } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";
import { AthenaEvent, type EnrollmentCreatedEvent } from "src/shared/events/types";

import { InitializeProgressCommand } from "../application/commands/initialize-progress.command";

@Injectable()
export class ProgressEventListener {
  private readonly logger = new Logger(ProgressEventListener.name);

  constructor(private readonly commandBus: CommandBus) {}

  @OnEvent(AthenaEvent.ENROLLMENT_CREATED)
  async handleEnrollmentCreated(payload: EnrollmentCreatedEvent) {
    this.logger.log(`Enrollment created for user ${payload.userId}. Initializing progress...`);

    await this.commandBus.execute(new InitializeProgressCommand(payload.id, payload.courseId, payload.userId));
  }
}
