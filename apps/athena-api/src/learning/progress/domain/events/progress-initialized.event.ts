export class ProgressInitializedEvent {
  constructor(
    public readonly progressId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly enrollmentId: string,
  ) {}
}
