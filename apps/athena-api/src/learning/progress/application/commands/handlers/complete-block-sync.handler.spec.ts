import { NotFoundException } from "@nestjs/common";
import { EventPublisher } from "@nestjs/cqrs";
import { Test, TestingModule } from "@nestjs/testing";

import { CompleteBlockSyncHandler } from "./complete-block-sync.handler";
import { ContentService } from "../../../../../content";
import { PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { CompleteBlockSyncCommand } from "../complete-block-sync.command";

const mockRepo = {
  findByUserAndCourse: jest.fn(),
  save: jest.fn(),
};

const mockPublisher = {
  mergeObjectContext: jest.fn(obj => obj),
};

const mockContentService = {
  getProgressStats: jest.fn(),
};

const mockAggregate = {
  completeBlockSync: jest.fn(),
  commit: jest.fn(),
};

describe("CompleteBlockSyncHandler", () => {
  let handler: CompleteBlockSyncHandler;

  const CMD = new CompleteBlockSyncCommand("user-1", "course-1", "lesson-1", "block-1", 100);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteBlockSyncHandler,
        { provide: PROGRESS_REPOSITORY, useValue: mockRepo },
        { provide: EventPublisher, useValue: mockPublisher },
        { provide: ContentService, useValue: mockContentService },
      ],
    }).compile();

    handler = module.get<CompleteBlockSyncHandler>(CompleteBlockSyncHandler);

    jest.clearAllMocks();
  });

  it("should execute successfully (Happy Path)", async () => {
    mockRepo.findByUserAndCourse.mockResolvedValue(mockAggregate);

    mockContentService.getProgressStats.mockResolvedValue({
      totalBlocksInLesson: 5,
      totalLessonsInCourse: 10,
    });

    await handler.execute(CMD);

    expect(mockRepo.findByUserAndCourse).toHaveBeenCalledWith(CMD.userId, CMD.courseId);

    expect(mockContentService.getProgressStats).toHaveBeenCalledWith(CMD.courseId, CMD.lessonId);

    expect(mockAggregate.completeBlockSync).toHaveBeenCalledWith(CMD.blockId, CMD.lessonId, 5, 10, CMD.score);

    expect(mockRepo.save).toHaveBeenCalledWith(mockAggregate);
    expect(mockAggregate.commit).toHaveBeenCalled();
  });

  it("should throw NotFoundException if progress does not exist", async () => {
    mockRepo.findByUserAndCourse.mockResolvedValue(null);

    await expect(handler.execute(CMD)).rejects.toThrow(NotFoundException);

    expect(mockContentService.getProgressStats).not.toHaveBeenCalled();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
