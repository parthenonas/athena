/**
 * @class LessonCompletedEvent
 * @description
 * Emitted when all required blocks within a single lesson are graded.
 *
 * Triggered by:
 * - StudentProgress Aggregate.
 *
 * Consumers:
 * - ReadModelProjector: Updates the lesson icon to "Green Checkmark".
 * - AccessControlService: Unlocks the *next* lesson (if sequential access is enabled).
 */
export class LessonCompletedEvent {
  constructor(
    public readonly progressId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly lessonId: string,
    public readonly completedAt: Date = new Date(),
  ) {}
}
