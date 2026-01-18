import { Command } from "@nestjs/cqrs";

export class GradeBlockCommand extends Command<void> {
  constructor(
    public readonly userId: string,
    public readonly courseId: string,
    public readonly blockId: string,
    public readonly score: number,
    public readonly feedback?: string,
  ) {
    super();
  }
}
