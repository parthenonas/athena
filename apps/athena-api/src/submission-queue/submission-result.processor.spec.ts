import { SubmissionResult, ExecutionStatus } from "@athena/types";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { Job } from "bullmq";

import { SubmissionResultProcessor } from "./submission-result.processor";

describe("SubmissionResultProcessor", () => {
  let processor: SubmissionResultProcessor;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const mockEventEmitter = {
      emitAsync: jest.fn().mockResolvedValue(["listener_result"]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionResultProcessor,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    processor = module.get<SubmissionResultProcessor>(SubmissionResultProcessor);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  describe("process", () => {
    it("should process job, emit event asynchronously, and return success status", async () => {
      const mockResult: SubmissionResult = {
        submissionId: "sub-123",
        status: ExecutionStatus.Accepted,
        stdout: "Success",
        metadata: { context: "LEARN" },
      };

      const mockJob = {
        data: mockResult,
        id: "job-1",
      } as Job<SubmissionResult, void, string>;

      const result = await processor.process(mockJob);

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith("submission.completed", mockResult);

      expect(result).toEqual({ processed: true });
    });

    it("should propagate errors if emitAsync fails", async () => {
      const mockError = new Error("Database connection failed");
      jest.spyOn(eventEmitter, "emitAsync").mockRejectedValueOnce(mockError);

      const mockJob = {
        data: { submissionId: "fail-id" },
      } as Job;

      await expect(processor.process(mockJob)).rejects.toThrow(mockError);
    });
  });
});
