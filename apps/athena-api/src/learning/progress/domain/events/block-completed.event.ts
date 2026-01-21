import { ProgressStatus } from "@athena/types";

export class BlockCompletedEvent {
  constructor(
    public readonly progressId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly lessonId: string,
    public readonly blockId: string,
    public readonly score: number,
    public readonly courseScore: number,
    public readonly lessonStatus: ProgressStatus,
    public readonly courseStatus: ProgressStatus,
  ) {}
}
