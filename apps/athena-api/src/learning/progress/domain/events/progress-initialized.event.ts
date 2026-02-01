/**
 * @class ProgressInitializedEvent
 * @description
 * Emitted when a new progress tracking record is created.
 *
 * Triggered by:
 * - InitializeProgressHandler (reacting to EnrollmentCreated).
 *
 * Consumers:
 * - ReadModelProjector: Creates the initial "skeleton" document in MongoDB
 * so the course immediately appears in the student's dashboard.
 */
export class ProgressInitializedEvent {
  constructor(
    public readonly progressId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly enrollmentId: string,
  ) {}
}
