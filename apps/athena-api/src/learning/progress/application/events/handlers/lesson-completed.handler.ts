import { Logger } from "@nestjs/common";
import { CommandBus, EventsHandler, IEventHandler } from "@nestjs/cqrs";

import { LessonCompletedEvent } from "../../../domain/events/lesson-completed.event";

@EventsHandler(LessonCompletedEvent)
export class LessonCompletedHandler implements IEventHandler<LessonCompletedEvent> {
  private readonly logger = new Logger(LessonCompletedHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  handle(event: LessonCompletedEvent) {
    this.logger.log(`Lesson ${event.lessonId} completed by ${event.studentId}`);

    // TODO: some logic here ...
  }
}
