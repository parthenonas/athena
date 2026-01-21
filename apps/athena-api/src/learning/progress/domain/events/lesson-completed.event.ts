export class LessonCompletedEvent {
  constructor(
    public readonly progressId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly lessonId: string,
    public readonly completedAt: Date = new Date(),
  ) {}
}
