import { ExecutionStatus } from "@athena/types";
import { CommandBus } from "@nestjs/cqrs";
import { Test, TestingModule } from "@nestjs/testing";

import { GradingListener } from "./grading.listener";
import { SubmissionCompletedEvent } from "../../../shared/events/types";
import { GradeBlockCommand } from "../application/commands/grade-block.command";

const mockCommandBus = {
  execute: jest.fn(),
};

describe("GradingListener", () => {
  let listener: GradingListener;

  const META = {
    context: "LEARN",
    userId: "user-1",
    courseId: "course-1",
    lessonId: "lesson-1",
    blockId: "block-1",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GradingListener, { provide: CommandBus, useValue: mockCommandBus }],
    }).compile();

    listener = module.get<GradingListener>(GradingListener);

    jest.clearAllMocks();
  });

  it("should process ACCEPTED result -> Score 100", async () => {
    const event: SubmissionCompletedEvent = {
      result: {
        submissionId: "sub-1",
        status: ExecutionStatus.Accepted,
        stdout: "Hello World",
        stderr: "",
        metadata: META,
        time: 100,
        memory: 1024,
      },
    };

    await listener.handleSubmissionResult(event);

    expect(mockCommandBus.execute).toHaveBeenCalledWith(
      new GradeBlockCommand(META.userId, META.courseId, META.lessonId, META.blockId, 100, "Output:\nHello World"),
    );
  });

  it("should process WRONG_ANSWER result -> Score 0 + Stderr", async () => {
    const event: SubmissionCompletedEvent = {
      result: {
        submissionId: "sub-2",
        status: ExecutionStatus.CompilationError,
        stdout: "",
        stderr: "SyntaxError: Unexpected token",
        metadata: META,
        time: 0,
        memory: 0,
      },
    };

    await listener.handleSubmissionResult(event);

    expect(mockCommandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 0,
        feedback: "Error:\nSyntaxError: Unexpected token",
      }),
    );
  });

  it("should handle SYSTEM_ERROR gracefully", async () => {
    const event: SubmissionCompletedEvent = {
      result: {
        submissionId: "sub-3",
        status: ExecutionStatus.SystemError,
        stdout: "",
        stderr: "",
        message: "Docker daemon unreachable",
        metadata: META,
        time: 0,
        memory: 0,
      },
    };

    await listener.handleSubmissionResult(event);

    expect(mockCommandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 0,
        feedback: "System Error: Docker daemon unreachable",
      }),
    );
  });

  it("should IGNORE events with context != LEARN", async () => {
    const event: SubmissionCompletedEvent = {
      result: {
        submissionId: "sub-4",
        status: ExecutionStatus.Accepted,
        metadata: { ...META, context: "CONTEST" },
        time: 100,
        memory: 1024,
      },
    };

    await listener.handleSubmissionResult(event);

    expect(mockCommandBus.execute).not.toHaveBeenCalled();
  });
});
