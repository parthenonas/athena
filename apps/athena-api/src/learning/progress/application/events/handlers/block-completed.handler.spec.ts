import { ProgressStatus } from "@athena/types";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";

import { BlockCompletedHandler } from "./block-completed.handler";
import { BlockCompletedEvent } from "../../../domain/events/block-completed.event";
import { StudentDashboard } from "../../../infrastructure/persistence/mongo/schemas/student-dashboard.schema";

const mockModel = {
  updateOne: jest.fn(),
};

describe("BlockCompletedHandler (Projection)", () => {
  let handler: BlockCompletedHandler;

  const EVENT = new BlockCompletedEvent(
    "progress-1",
    "student-1",
    "course-1",
    "lesson-1",
    "block-1",
    100,
    500,
    ProgressStatus.COMPLETED,
    ProgressStatus.IN_PROGRESS,
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockCompletedHandler,
        {
          provide: getModelToken(StudentDashboard.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    handler = module.get<BlockCompletedHandler>(BlockCompletedHandler);

    jest.clearAllMocks();
  });

  it("should project event data to MongoDB via atomic $set update", async () => {
    mockModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await handler.handle(EVENT);

    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { studentId: EVENT.studentId, courseId: EVENT.courseId },

      {
        $set: {
          [`lessons.${EVENT.lessonId}.completedBlocks.${EVENT.blockId}`]: EVENT.score,
          [`lessons.${EVENT.lessonId}.status`]: EVENT.lessonStatus,

          totalScore: EVENT.courseScore,
          status: EVENT.courseStatus,
          updatedAt: expect.any(Date),
        },
      },
    );
  });
});
