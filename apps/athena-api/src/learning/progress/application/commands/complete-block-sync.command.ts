import { Command } from "@nestjs/cqrs";

export class CompleteBlockSyncCommand extends Command<void> {
  constructor(
    public readonly userId: string,
    public readonly courseId: string,
    public readonly lessonId: string,
    public readonly blockId: string,
    public readonly score: number = 100,
  ) {
    super();
  }
}
