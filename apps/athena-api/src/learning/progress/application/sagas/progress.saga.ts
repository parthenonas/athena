import { Injectable, Logger } from "@nestjs/common";
import { Saga, ICommand, ofType } from "@nestjs/cqrs";
import { Observable, ignoreElements, mergeMap, catchError, of } from "rxjs";
import { v4 as uuid } from "uuid";

import { ContentService } from "../../../../content";
import { SubmissionQueueService } from "../../../../submission-queue";
import { SubmissionPayloadDto } from "../../../../submission-queue/dto/submission-payload.dto";
import { SubmissionReceivedEvent } from "../../domain/events/submission-received.event";

@Injectable()
export class ProgressSagas {
  private readonly logger = new Logger(ProgressSagas.name);

  constructor(
    private readonly submissionService: SubmissionQueueService,
    private readonly contentService: ContentService,
  ) {}

  @Saga()
  submissionReceived = (events$: Observable<unknown>): Observable<ICommand | null> => {
    return events$.pipe(
      ofType(SubmissionReceivedEvent),
      mergeMap(async event => {
        try {
          this.logger.log(`Saga processing submission: ${event.progressId}`);

          const dbContent = await this.contentService.getCodeBlockContext(event.blockId, event.studentId);

          const payload: SubmissionPayloadDto = {
            submissionId: uuid(),
            metadata: {
              context: "LEARN",
              userId: event.studentId,
              courseId: event.courseId,
              blockId: event.blockId,
              socketId: event.submissionData.socketId,
            },
            content: {
              language: event.submissionData.language,
              initialCode: event.submissionData.code,
              executionMode: dbContent.executionMode,
              testCasesCode: dbContent.testCasesCode,
              timeLimit: dbContent.timeLimit,
              memoryLimit: dbContent.memoryLimit,
              taskText: dbContent.taskText || { json: {} },
            },
          };

          this.logger.log(`Enriched payload created. Sending to Runner Queue...`);

          await this.submissionService.sendForExecution(payload);
        } catch (error) {
          this.logger.error(`Error in Saga: ${(error as Error).message}`, (error as Error).stack);
        }
      }),
      catchError(err => {
        this.logger.error("Critical Saga Error", err);
        return of(null);
      }),
      ignoreElements(),
    );
  };
}
