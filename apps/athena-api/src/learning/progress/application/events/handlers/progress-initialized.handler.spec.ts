import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";

import { ProgressInitializedHandler } from "./progress-initialized.handler";
import { ContentService } from "../../../../../content/content.service";
import { Enrollment } from "../../../../enrollment/entities/enrollment.entity";
import { ProgressInitializedEvent } from "../../../domain/events/progress-initialized.event";
import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";

const mockDashboardModel = {
  updateOne: jest.fn(),
};

const mockContentService = {
  getCourseById: jest.fn(),
  getLessonsByCourseId: jest.fn(),
};

const mockEnrollmentRepo = {
  findOne: jest.fn(),
};

describe("ProgressInitializedHandler (Projection)", () => {
  let handler: ProgressInitializedHandler;

  const EVENT = new ProgressInitializedEvent("progress-1", "student-1", "course-1", "enrollment-1");

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressInitializedHandler,
        { provide: getModelToken(StudentDashboard.name), useValue: mockDashboardModel },
        { provide: ContentService, useValue: mockContentService },
        { provide: getRepositoryToken(Enrollment), useValue: mockEnrollmentRepo },
      ],
    }).compile();

    handler = module.get<ProgressInitializedHandler>(ProgressInitializedHandler);

    jest.clearAllMocks();
  });

  it("should aggregate data and UPSERT dashboard record", async () => {
    mockContentService.getCourseById.mockResolvedValue({
      id: "course-1",
      title: "Advanced Node.js",
    });

    mockContentService.getLessonsByCourseId.mockResolvedValue([
      { id: "lesson-1", title: "Intro to Node" },
      { id: "lesson-2", title: "Streams & Buffers" },
    ]);

    mockEnrollmentRepo.findOne.mockResolvedValue({
      id: "enrollment-1",
      cohort: {
        name: "Winter 2026",
        instructor: {
          title: "Mr.",
          ownerId: "instructor-1",
        },
      },
    });

    mockDashboardModel.updateOne.mockResolvedValue({ upsertedCount: 1 });

    await handler.handle(EVENT);

    expect(mockContentService.getCourseById).toHaveBeenCalledWith(EVENT.courseId, EVENT.studentId);

    expect(mockEnrollmentRepo.findOne).toHaveBeenCalledWith({
      where: { id: EVENT.enrollmentId },
      relations: ["cohort", "cohort.instructor"],
    });

    expect(mockDashboardModel.updateOne).toHaveBeenCalledWith(
      { studentId: EVENT.studentId, courseId: EVENT.courseId },
      {
        $set: {
          courseTitle: "Advanced Node.js",
          cohortName: "Winter 2026",
          instructorName: "Mr. instructor-1",
          progressPercentage: 0,
          totalScore: 0,
          updatedAt: expect.any(Date),
        },
        $setOnInsert: {
          lessons: {
            "lesson-1": {
              title: "Intro to Node",
              status: "IN_PROGRESS",
              completedBlocks: {},
            },
            "lesson-2": {
              title: "Streams & Buffers",
              status: "LOCKED",
              completedBlocks: {},
            },
          },
          createdAt: expect.any(Date),
        },
      },
      { upsert: true },
    );
  });

  it("should abort if Enrollment or Course is missing (Data Integrity)", async () => {
    mockContentService.getCourseById.mockResolvedValue({ title: "Test Course" });
    mockEnrollmentRepo.findOne.mockResolvedValue(null);

    await handler.handle(EVENT);

    expect(mockDashboardModel.updateOne).not.toHaveBeenCalled();
  });

  it("should handle missing instructor gracefully", async () => {
    mockContentService.getCourseById.mockResolvedValue({ title: "Test Course" });
    mockEnrollmentRepo.findOne.mockResolvedValue({
      cohort: {
        name: "Self-Paced",
        instructor: null,
      },
    });

    await handler.handle(EVENT);

    expect(mockDashboardModel.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          instructorName: "Unknown Instructor",
        }),
      }),
      expect.anything(),
    );
  });
});
