import { Command } from "@nestjs/cqrs";

import { SubmitQuizDto } from "../dto/submit-quiz.dto";

export class SubmitQuizCommand extends Command<{ isCorrect: boolean; explanation?: string }> {
  constructor(
    public readonly userId: string,
    public readonly courseId: string,
    public readonly lessonId: string,
    public readonly blockId: string,
    public readonly payload: SubmitQuizDto,
  ) {
    super();
  }
}
