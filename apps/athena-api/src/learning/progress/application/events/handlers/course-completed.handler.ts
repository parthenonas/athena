import { Logger } from "@nestjs/common";
import { CommandBus, EventsHandler, IEventHandler } from "@nestjs/cqrs";

import { CourseCompletedEvent } from "../../../domain/events/course-completed.event";

@EventsHandler(CourseCompletedEvent)
export class CourseCompletedHandler implements IEventHandler<CourseCompletedEvent> {
  private readonly logger = new Logger(CourseCompletedHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  handle(event: CourseCompletedEvent) {
    this.logger.log(
      `🎓 COURSE COMPLETED! User: ${event.studentId}, Course: ${event.courseId}. Triggering certification...`,
    );

    // TODO: some logic here ...
  }
}
