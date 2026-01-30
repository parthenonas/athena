/**
 * @class GetStudentProgressQuery
 * @description
 * Request to retrieve the detailed progress map for a specific course.
 *
 * Use Case:
 * - Course Player / Course Map interface.
 * - Displays the tree of lessons/blocks, their lock status, grades, and completion ticks.
 *
 * Data Source:
 * - Read Model (MongoDB): Fetches a single document matching { studentId, courseId }.
 */
export class GetStudentProgressQuery {
  constructor(
    /**
     * The ID of the student.
     */
    public readonly userId: string,

    /**
     * The specific Course ID to load.
     */
    public readonly courseId: string,
  ) {}
}
