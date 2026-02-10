import { EventPublisher } from "@nestjs/cqrs";
import { Test, TestingModule } from "@nestjs/testing";

import { InitializeProgressHandler } from "./initialize-progress.handler";
import { PROGRESS_REPOSITORY } from "../../../domain/repository/progress.repository";
import { StudentProgress } from "../../../domain/student-progress.model";
import { InitializeProgressCommand } from "../initialize-progress.command";

const mockRepo = {
  findByEnrollmentId: jest.fn(),
  save: jest.fn(),
};

const mockPublisher = {
  mergeObjectContext: jest.fn(obj => obj),
};

describe("InitializeProgressHandler", () => {
  let handler: InitializeProgressHandler;

  const CMD = new InitializeProgressCommand("enrollment-1", "course-1", "student-1");

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InitializeProgressHandler,
        { provide: PROGRESS_REPOSITORY, useValue: mockRepo },
        { provide: EventPublisher, useValue: mockPublisher },
      ],
    }).compile();

    handler = module.get<InitializeProgressHandler>(InitializeProgressHandler);

    jest.clearAllMocks();
  });

  it("should create and save new progress if it does not exist", async () => {
    mockRepo.findByEnrollmentId.mockResolvedValue(null);

    const createSpy = jest.spyOn(StudentProgress, "create");

    await handler.execute(CMD);

    expect(mockRepo.findByEnrollmentId).toHaveBeenCalledWith(CMD.enrollmentId);

    expect(createSpy).toHaveBeenCalledWith(expect.any(String), CMD.enrollmentId, CMD.courseId, CMD.studentId);

    expect(mockRepo.save).toHaveBeenCalled();
  });

  it("should SKIP creation if progress already exists (Idempotency)", async () => {
    mockRepo.findByEnrollmentId.mockResolvedValue({ id: "existing-progress-id" });

    const createSpy = jest.spyOn(StudentProgress, "create");

    await handler.execute(CMD);

    expect(mockRepo.findByEnrollmentId).toHaveBeenCalledWith(CMD.enrollmentId);

    expect(createSpy).not.toHaveBeenCalled();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
