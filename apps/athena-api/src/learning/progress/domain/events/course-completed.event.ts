/**
 * @class CourseCompletedEvent
 * @description
 * Emitted when the student has successfully completed all required lessons in a course.
 *
 * Triggered by:
 * - StudentProgress Aggregate (when recalculating state after a block completion).
 *
 * Consumers:
 * - CertificateService: Generates a PDF certificate.
 * - NotificationService: Sends "Congratulations" email.
 * - ReadModelProjector: Marks the course card as "Completed" in the UI.
 */
export class CourseCompletedEvent {
  constructor(
    public readonly progressId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly completedAt: Date = new Date(),
  ) {}
}
