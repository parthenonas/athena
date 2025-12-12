import { ProgrammingLanguage, CodeExecutionMode } from "@athena/types";
import { getQueueToken } from "@nestjs/bullmq";
import { Test, TestingModule } from "@nestjs/testing";
import { Queue } from "bullmq";

import { SubmissionPayloadDto } from "./dto/submission-payload.dto";
import { SubmissionQueueService } from "./submission-queue.service";

describe("SubmissionQueueService", () => {
  let service: SubmissionQueueService;
  let mockQueue: Partial<Queue>;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: "job-123" } as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionQueueService,
        {
          provide: getQueueToken("execution"),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<SubmissionQueueService>(SubmissionQueueService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sendForExecution", () => {
    it("should use existing submissionId if provided", async () => {
      const submissionId = "uuid-123-456";
      const payload: SubmissionPayloadDto = {
        submissionId: submissionId,
        content: {
          initialCode: 'print("hello")',
          language: ProgrammingLanguage.Python,
          executionMode: CodeExecutionMode.IoCheck,
        },
        metadata: { context: "LEARN" },
      };

      const result = await service.sendForExecution(payload);

      expect(result).toEqual({
        submissionId: submissionId,
        status: "queued",
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        "run-code",
        payload,
        expect.objectContaining({
          jobId: submissionId,
          removeOnComplete: expect.anything(),
        }),
      );
    });

    it("should generate a new submissionId if none is provided", async () => {
      const payload = {
        content: {
          initialCode: "SELECT 1",
          language: ProgrammingLanguage.SQL,
          executionMode: CodeExecutionMode.IoCheck,
        },
        metadata: {},
      } as SubmissionPayloadDto;

      const result = await service.sendForExecution(payload);

      expect(result.submissionId).toBeDefined();
      expect(result.status).toBe("queued");

      expect(mockQueue.add).toHaveBeenCalledWith(
        "run-code",
        payload,
        expect.objectContaining({
          jobId: result.submissionId,
        }),
      );
    });
  });
});
