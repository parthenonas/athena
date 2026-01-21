export class CourseCompletedEvent {
  constructor(
    public readonly progressId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly completedAt: Date = new Date(),
  ) {}
}
