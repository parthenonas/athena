import { NotFoundException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";
import { GetStudentProgressQuery } from "../get-student-progress.query";

/**
 * @class GetStudentProgressHandler
 * @description
 * Fetches the detailed progress record for a specific student in a specific course.
 *
 * Responsibilities:
 * - Specificity: Filters by BOTH `studentId` and `courseId`.
 * - Performance: Uses `.lean()` to return a plain JSON object (POJO), bypassing Mongoose overhead.
 * - Integrity: Throws `NotFoundException` if the record doesn't exist (e.g., user not enrolled).
 *
 * Use Case:
 * Used when the user opens the Course Player/Map to render the list of lessons,
 * locks/unlocks status, and individual block grades.
 */
@QueryHandler(GetStudentProgressQuery)
export class GetStudentProgressHandler implements IQueryHandler<GetStudentProgressQuery> {
  constructor(
    @InjectModel(StudentDashboard.name)
    private readonly dashboardModel: Model<StudentDashboard>,
  ) {}

  async execute(query: GetStudentProgressQuery): Promise<StudentDashboard> {
    const { userId, courseId } = query;

    const dashboard = await this.dashboardModel.findOne({ studentId: userId, courseId: courseId }).lean();

    if (!dashboard) {
      throw new NotFoundException("Progress not found");
    }

    return dashboard;
  }
}
