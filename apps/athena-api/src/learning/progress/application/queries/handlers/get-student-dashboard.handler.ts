import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { plainToInstance } from "class-transformer";
import { Model } from "mongoose";

import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";
import { StudentDashboardViewDto } from "../../dto/student-dashboard-view.dto";
import { GetStudentDashboardQuery } from "../get-student-dashboard.query";

/**
 * @class GetStudentDashboardHandler
 * @description
 * Handles the retrieval of the student's main dashboard view.
 *
 * Responsibilities:
 * - Read-Optimized Fetch: Queries the MongoDB projection directly.
 * - Performance: Uses `.lean()` to return plain JS objects instead of heavy Mongoose documents.
 * - Ordering: Returns courses sorted by recent activity (`updatedAt: -1`).
 *
 * Use Case:
 * Called when a student logs in or visits the "My Courses" page.
 * Returns a list of all enrolled courses with their current progress.
 */
@QueryHandler(GetStudentDashboardQuery)
export class GetStudentDashboardHandler implements IQueryHandler<GetStudentDashboardQuery> {
  constructor(
    @InjectModel(StudentDashboard.name)
    private readonly dashboardModel: Model<StudentDashboard>,
  ) {}

  async execute(query: GetStudentDashboardQuery): Promise<StudentDashboardViewDto[]> {
    const result = await this.dashboardModel.find({ studentId: query.studentId }).sort({ updatedAt: -1 }).lean().exec();
    return plainToInstance(StudentDashboardViewDto, result, { excludeExtraneousValues: false });
  }
}
