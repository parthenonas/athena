export class BlockCompletedEvent {
  constructor(
    public readonly progressId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly blockId: string,
    public readonly score: number,
  ) {}
}
