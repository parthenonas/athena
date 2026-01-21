import { Command } from "@nestjs/cqrs";

import { StudentSubmissionDto } from "../dto/student-submission.dto";

export class SubmitAssignmentCommand extends Command<void> {
  constructor(
    public readonly userId: string,
    public readonly courseId: string,
    public readonly lessonId: string,
    public readonly blockId: string,
    public readonly payload: StudentSubmissionDto,
  ) {
    super();
  }
}
