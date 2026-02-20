import { Injectable, Logger } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { OnEvent } from "@nestjs/event-emitter";

import { AthenaEvent, type EnrollmentDeletedEvent, type EnrollmentCreatedEvent } from "../../../shared/events/types";
import { DeleteProgressCommand } from "../application/commands/delete-progress.command";
import { InitializeProgressCommand } from "../application/commands/initialize-progress.command";

/**
 * @class ProgressEventListener
 * @description
 * Reacts to domain events occurring in other modules (specifically Enrollment).
 *
 * Pattern: Event-Driven Integration
 *
 * Responsibilities:
 * - Decoupling: Allows the Enrollment module to remain unaware of the Progress module.
 * - Workflow Trigger: Automatically initializes a student's progress tracker
 * immediately after they purchase or enroll in a course.
 */
@Injectable()
export class ProgressEventListener {
  private readonly logger = new Logger(ProgressEventListener.name);

  constructor(private readonly commandBus: CommandBus) {}

  @OnEvent(AthenaEvent.ENROLLMENT_CREATED)
  async handleEnrollmentCreated(payload: EnrollmentCreatedEvent) {
    this.logger.log(`Enrollment created for user ${payload.userId}. Initializing progress...`);

    await this.commandBus.execute(new InitializeProgressCommand(payload.id, payload.courseId, payload.userId));
  }

  @OnEvent(AthenaEvent.ENROLLMENT_DELETED)
  async handleEnrollmentDeleted(payload: EnrollmentDeletedEvent) {
    this.logger.log(`Cleaning up progress for deleted enrollment: ${payload.id} for user: ${payload.userId}`);

    await this.commandBus.execute(new DeleteProgressCommand(payload.id, payload.courseId, payload.userId));
  }
}
