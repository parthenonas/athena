import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";

import { GetStudentDashboardHandler } from "./get-student-dashboard.handler";
import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";
import { GetStudentDashboardQuery } from "../get-student-dashboard.query";

const mockExec = jest.fn();
const mockLean = jest.fn().mockReturnValue({ exec: mockExec });
const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
const mockFind = jest.fn().mockReturnValue({ sort: mockSort });

const mockDashboardModel = {
  find: mockFind,
};

describe("GetStudentDashboardHandler (Read Side)", () => {
  let handler: GetStudentDashboardHandler;

  const QUERY = new GetStudentDashboardQuery("student-1");

  const MOCK_DATA = [
    { courseId: "c1", title: "React", progressPercentage: 50 },
    { courseId: "c2", title: "Node", progressPercentage: 10 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetStudentDashboardHandler,
        {
          provide: getModelToken(StudentDashboard.name),
          useValue: mockDashboardModel,
        },
      ],
    }).compile();

    handler = module.get<GetStudentDashboardHandler>(GetStudentDashboardHandler);

    jest.clearAllMocks();
  });

  it("should fetch, sort, and return lean dashboard objects", async () => {
    mockExec.mockResolvedValue(MOCK_DATA);

    const result = await handler.execute(QUERY);
    expect(mockDashboardModel.find).toHaveBeenCalledWith({ studentId: QUERY.studentId });

    expect(mockSort).toHaveBeenCalledWith({ updatedAt: -1 });

    expect(mockLean).toHaveBeenCalled();

    expect(result).toEqual(MOCK_DATA);
  });

  it("should return empty array if no dashboards found", async () => {
    mockExec.mockResolvedValue([]);

    const result = await handler.execute(QUERY);

    expect(result).toEqual([]);
    expect(mockDashboardModel.find).toHaveBeenCalled();
  });
});
