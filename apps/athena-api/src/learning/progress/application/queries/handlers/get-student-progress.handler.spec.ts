import { NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";

import { GetStudentProgressHandler } from "./get-student-progress.handler";
import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";
import { GetStudentProgressQuery } from "../get-student-progress.query";

const mockLean = jest.fn();
const mockFindOne = jest.fn().mockReturnValue({ lean: mockLean });

const mockDashboardModel = {
  findOne: mockFindOne,
};

describe("GetStudentProgressHandler (Read Side)", () => {
  let handler: GetStudentProgressHandler;

  const QUERY = new GetStudentProgressQuery("student-1", "course-1");

  const MOCK_DASHBOARD = {
    studentId: "student-1",
    courseId: "course-1",
    totalScore: 100,
    lessons: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetStudentProgressHandler,
        {
          provide: getModelToken(StudentDashboard.name),
          useValue: mockDashboardModel,
        },
      ],
    }).compile();

    handler = module.get<GetStudentProgressHandler>(GetStudentProgressHandler);

    jest.clearAllMocks();
  });

  it("should return the specific dashboard if found", async () => {
    mockLean.mockResolvedValue(MOCK_DASHBOARD);

    const result = await handler.execute(QUERY);

    expect(mockDashboardModel.findOne).toHaveBeenCalledWith({
      studentId: QUERY.userId,
      courseId: QUERY.courseId,
    });

    expect(mockLean).toHaveBeenCalled();
    expect(result).toEqual(MOCK_DASHBOARD);
  });

  it("should throw NotFoundException if progress does not exist", async () => {
    mockLean.mockResolvedValue(null);

    await expect(handler.execute(QUERY)).rejects.toThrow(NotFoundException);

    expect(mockDashboardModel.findOne).toHaveBeenCalled();
  });
});
