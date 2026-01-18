export class GetStudentProgressQuery {
  constructor(
    public readonly userId: string,
    public readonly courseId: string,
  ) {}
}
