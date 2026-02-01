import { ProgrammingLanguage } from "@athena/types";
import { NotFoundException } from "@nestjs/common";
import { EventPublisher } from "@nestjs/cqrs";
import { Test, TestingModule } from "@nestjs/testing";

import { SubmitAssignmentHandler } from "./submit-assignment.handler";
import { PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { SubmitAssignmentCommand } from "../submit-assignment.command";

const mockRepo = {
  findByUserAndCourse: jest.fn(),
  save: jest.fn(),
};

const mockPublisher = {
  mergeObjectContext: jest.fn(obj => obj),
};

const mockAggregate = {
  submitBlockAsync: jest.fn(),
  commit: jest.fn(),
};

describe("SubmitAssignmentHandler", () => {
  let handler: SubmitAssignmentHandler;

  const CMD = new SubmitAssignmentCommand("user-1", "course-1", "lesson-1", "block-1", {
    code: "print('Hello')",
    language: ProgrammingLanguage.Python,
    socketId: "socket-123",
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitAssignmentHandler,
        { provide: PROGRESS_REPOSITORY, useValue: mockRepo },
        { provide: EventPublisher, useValue: mockPublisher },
      ],
    }).compile();

    handler = module.get<SubmitAssignmentHandler>(SubmitAssignmentHandler);

    jest.clearAllMocks();
  });

  it("should mark block as PENDING and save payload (Happy Path)", async () => {
    mockRepo.findByUserAndCourse.mockResolvedValue(mockAggregate);

    await handler.execute(CMD);

    expect(mockRepo.findByUserAndCourse).toHaveBeenCalledWith(CMD.userId, CMD.courseId);

    expect(mockAggregate.submitBlockAsync).toHaveBeenCalledWith(CMD.blockId, CMD.lessonId, CMD.payload);

    expect(mockRepo.save).toHaveBeenCalledWith(mockAggregate);
    expect(mockAggregate.commit).toHaveBeenCalled();
  });

  it("should throw NotFoundException if user is not enrolled (no progress)", async () => {
    mockRepo.findByUserAndCourse.mockResolvedValue(null);

    await expect(handler.execute(CMD)).rejects.toThrow(NotFoundException);

    expect(mockAggregate.submitBlockAsync).not.toHaveBeenCalled();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
