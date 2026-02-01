import { ProgrammingLanguage } from "@athena/types";
import { Test, TestingModule } from "@nestjs/testing";
import { of } from "rxjs";

import { ProgressSagas } from "./progress.saga";
import { ContentService } from "../../../../content";
import { SubmissionQueueService } from "../../../../submission-queue";
import { SubmissionReceivedEvent } from "../../domain/events/submission-received.event";

const mockSubmissionService = {
  sendForExecution: jest.fn(),
};

const mockContentService = {
  getCodeBlockContext: jest.fn(),
};

describe("ProgressSagas", () => {
  let sagas: ProgressSagas;

  const EVENT = new SubmissionReceivedEvent("progress-1", "student-1", "course-1", "lesson-1", "block-1", {
    code: "console.log('test')",
    language: ProgrammingLanguage.Python,
    socketId: "socket-1",
  });

  const MOCK_CONTEXT = {
    executionMode: "node",
    testCasesCode: "assert(true)",
    timeLimit: 1000,
    memoryLimit: 128,
    taskText: { json: {} },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressSagas,
        { provide: SubmissionQueueService, useValue: mockSubmissionService },
        { provide: ContentService, useValue: mockContentService },
      ],
    }).compile();

    sagas = module.get<ProgressSagas>(ProgressSagas);

    jest.clearAllMocks();
  });

  it("should enrich event data and send payload to SubmissionQueue", done => {
    mockContentService.getCodeBlockContext.mockResolvedValue(MOCK_CONTEXT);
    mockSubmissionService.sendForExecution.mockResolvedValue(true);

    sagas.submissionReceived(of(EVENT)).subscribe({
      complete: () => {
        try {
          expect(mockContentService.getCodeBlockContext).toHaveBeenCalledWith(EVENT.blockId, EVENT.studentId);

          expect(mockSubmissionService.sendForExecution).toHaveBeenCalledWith(
            expect.objectContaining({
              metadata: expect.objectContaining({
                userId: EVENT.studentId,
                lessonId: EVENT.lessonId,
                blockId: EVENT.blockId,
              }),
              content: expect.objectContaining({
                initialCode: EVENT.submissionData.code,
                timeLimit: MOCK_CONTEXT.timeLimit,
              }),
            }),
          );

          done();
        } catch (err) {
          done(err);
        }
      },
    });
  });

  it("should catch errors from ContentService and NOT crash the stream", done => {
    mockContentService.getCodeBlockContext.mockRejectedValue(new Error("DB Connection Failed"));

    sagas.submissionReceived(of(EVENT)).subscribe({
      complete: () => {
        expect(mockSubmissionService.sendForExecution).not.toHaveBeenCalled();

        done();
      },
      error: () => {
        done(new Error("Saga stream crashed! It should have handled the error gracefully."));
      },
    });
  });
});
