import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";

import { DeleteProgressHandler } from "./delete-progress.handler";
import { PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";
import { DeleteProgressCommand } from "../delete-progress.command";

const mockRepo = {
  deleteByEnrollmentId: jest.fn(),
};

const mockDashboardModel = {
  deleteOne: jest.fn(),
};

describe("DeleteProgressHandler", () => {
  let handler: DeleteProgressHandler;

  const CMD = new DeleteProgressCommand("enrollment-1", "course-1", "student-1");

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteProgressHandler,
        { provide: PROGRESS_REPOSITORY, useValue: mockRepo },
        { provide: getModelToken(StudentDashboard.name), useValue: mockDashboardModel },
      ],
    }).compile();

    handler = module.get<DeleteProgressHandler>(DeleteProgressHandler);

    jest.clearAllMocks();
  });

  it("should delete progress from PostgreSQL and dashboard from MongoDB", async () => {
    mockRepo.deleteByEnrollmentId.mockResolvedValue(undefined);
    mockDashboardModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await handler.execute(CMD);

    expect(mockRepo.deleteByEnrollmentId).toHaveBeenCalledWith(CMD.enrollmentId);

    expect(mockDashboardModel.deleteOne).toHaveBeenCalledWith({
      studentId: CMD.studentId,
      courseId: CMD.courseId,
    });
  });
});
