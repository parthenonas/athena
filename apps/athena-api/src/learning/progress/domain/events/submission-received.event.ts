import { StudentSubmissionDto } from "../../application/dto/student-submission.dto";

export class SubmissionReceivedEvent {
  constructor(
    public readonly progressId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly blockId: string,
    public readonly submissionData: StudentSubmissionDto,
  ) {}
}
