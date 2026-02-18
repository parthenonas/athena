export class GetStudentLessonQuery {
  constructor(
    public readonly userId: string,
    public readonly courseId: string,
    public readonly lessonId: string,
  ) {}
}
