import { NotFoundException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";
import { GetStudentProgressQuery } from "../get-student-progress.query";

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
