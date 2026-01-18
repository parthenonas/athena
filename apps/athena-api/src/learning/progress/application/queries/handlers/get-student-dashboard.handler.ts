import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";
import { GetStudentDashboardQuery } from "../get-student-dashboard.query";

@QueryHandler(GetStudentDashboardQuery)
export class GetStudentDashboardHandler implements IQueryHandler<GetStudentDashboardQuery> {
  constructor(
    @InjectModel(StudentDashboard.name)
    private readonly dashboardModel: Model<StudentDashboard>,
  ) {}

  async execute(query: GetStudentDashboardQuery): Promise<StudentDashboard[]> {
    return this.dashboardModel.find({ studentId: query.studentId }).sort({ updatedAt: -1 }).lean().exec();
  }
}
