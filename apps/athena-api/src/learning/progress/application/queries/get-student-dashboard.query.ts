/**
 * @class GetStudentDashboardQuery
 * @description
 * Request to retrieve the high-level dashboard for a student.
 *
 * Use Case:
 * - "My Courses" page.
 * - Displays a list of all enrolled courses with progress bars, instructor names, and badges.
 *
 * Data Source:
 * - Read Model (MongoDB): Fetches from `student_dashboards` collection.
 * - Optimized for speed (no joins).
 */
export class GetStudentDashboardQuery {
  constructor(
    /**
     * The ID of the student requesting their dashboard.
     */
    public readonly studentId: string,
  ) {}
}
