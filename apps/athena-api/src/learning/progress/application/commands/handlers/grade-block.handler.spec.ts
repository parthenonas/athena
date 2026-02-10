import { NotFoundException } from "@nestjs/common";
import { EventPublisher } from "@nestjs/cqrs";
import { Test, TestingModule } from "@nestjs/testing";

import { GradeBlockHandler } from "./grade-block.handler";
import { ContentService } from "../../../../../content";
import { PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { GradeBlockCommand } from "../grade-block.command";

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
  gradeBlock: jest.fn(),
  commit: jest.fn(),
};

describe("GradeBlockHandler", () => {
  let handler: GradeBlockHandler;

  const CMD = new GradeBlockCommand(
    "user-1",
    "course-1",
    "lesson-1",
    "block-1",
    100,
    "Compilation success\nTest passed",
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradeBlockHandler,
        { provide: PROGRESS_REPOSITORY, useValue: mockRepo },
        { provide: EventPublisher, useValue: mockPublisher },
        { provide: ContentService, useValue: mockContentService },
      ],
    }).compile();

    handler = module.get<GradeBlockHandler>(GradeBlockHandler);

    jest.clearAllMocks();
  });

  it("should grade block successfully (Happy Path)", async () => {
    mockRepo.findByUserAndCourse.mockResolvedValue(mockAggregate);

    mockContentService.getProgressStats.mockResolvedValue({
      totalBlocksInLesson: 3,
      totalLessonsInCourse: 5,
    });

    await handler.execute(CMD);

    expect(mockRepo.findByUserAndCourse).toHaveBeenCalledWith(CMD.userId, CMD.courseId);

    expect(mockContentService.getProgressStats).toHaveBeenCalledWith(CMD.courseId, CMD.lessonId);

    expect(mockAggregate.gradeBlock).toHaveBeenCalledWith(CMD.blockId, CMD.lessonId, 3, 5, CMD.score, CMD.feedback);

    expect(mockRepo.save).toHaveBeenCalledWith(mockAggregate);
    expect(mockAggregate.commit).toHaveBeenCalled();
  });

  it("should throw NotFoundException if progress missing", async () => {
    mockRepo.findByUserAndCourse.mockResolvedValue(null);

    await expect(handler.execute(CMD)).rejects.toThrow(NotFoundException);

    expect(mockAggregate.gradeBlock).not.toHaveBeenCalled();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
