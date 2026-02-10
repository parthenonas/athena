import { IEventBus } from "@athena/common";
import { SubmissionResult, ExecutionStatus } from "@athena/types";
import { Test, TestingModule } from "@nestjs/testing";
import { Job } from "bullmq";

import { SubmissionResultProcessor } from "./submission-result.processor";
import { AthenaEvent, SubmissionCompletedEvent } from "../shared/events/types";

describe("SubmissionResultProcessor", () => {
  let processor: SubmissionResultProcessor;
  let eventBus: IEventBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionResultProcessor,
        {
          provide: "IEventBus",
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<SubmissionResultProcessor>(SubmissionResultProcessor);
    eventBus = module.get("IEventBus");
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

      const payload: SubmissionCompletedEvent = {
        result: mockResult,
      };

      const mockJob = {
        data: mockResult,
        id: "job-1",
      } as Job<SubmissionResult, void, string>;

      const result = await processor.process(mockJob);

      expect(eventBus.publish).toHaveBeenCalledWith(AthenaEvent.SUBMISSION_COMPLETED, payload);

      expect(result).toEqual({ processed: true });
    });
  });
});
