import { Command } from "@nestjs/cqrs";

export class InitializeProgressCommand extends Command<void> {
  constructor(
    public readonly enrollmentId: string,
    public readonly courseId: string,
    public readonly studentId: string,
  ) {
    super();
  }
}
