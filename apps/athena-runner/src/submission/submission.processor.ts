import { ExecutionStatus } from "@athena/types";
import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { SandboxService } from "../sandbox/sandbox.service";
import { RunnerJobDataDto } from "./dto/runner-job-data.dto";
import { SubmissionResultDto } from "./dto/submission-result.dto";

@Processor("execution")
@Injectable()
export class SubmissionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionProcessor.name);

  constructor(
    private readonly sandboxService: SandboxService,
    @Inject("execution") private readonly queueName: string,
    @InjectQueue("submission-result") private readonly resultQueue: Queue,
  ) {
    super();
  }

  /**
   * BullMQ Worker Process Method.
   * Handles incoming jobs from the Redis queue.
   *
   * The return value of this method is automatically stored by BullMQ in Redis
   * under the job's `returnvalue` field. The main API can retrieve this later.
   *
   * @param job The BullMQ job containing the submission payload.
   * @returns The execution result DTO.
   */
  async process(job: Job<RunnerJobDataDto, SubmissionResultDto, string>): Promise<SubmissionResultDto> {
    const { submissionId } = job.data;
    this.logger.log(`[${this.queueName}] Processing submission: ${submissionId}`);

    try {
      const rawData = job.data;
      const jobDto = plainToInstance(RunnerJobDataDto, rawData);
      const errors = await validate(jobDto);

      if (errors.length > 0) {
        const errorMsg = errors.map(e => Object.values(e.constraints || {})).join(", ");
        this.logger.error(`Invalid job data for ${submissionId}: ${errorMsg}`);

        const errorResult: SubmissionResultDto = {
          submissionId: submissionId,
          status: ExecutionStatus.SystemError,
          message: `Invalid Job Data: ${errorMsg}`,
          stdout: "",
          stderr: "",
          time: 0,
          memory: 0,
          metadata: jobDto.metadata,
        };

        await this.sendResult(submissionId, errorResult);
        return errorResult;
      }

      const result = await this.sandboxService.execute(job.data);

      this.logger.log(`[${this.queueName}] Completed submission: ${submissionId} with status ${result.status}`);

      if (jobDto.metadata) {
        result.metadata = jobDto.metadata;
      }

      await this.sendResult(submissionId, result);

      this.logger.debug(`Result sent to submission-result queue for ${submissionId}`);

      return result;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.logger.error(`[${this.queueName}] System Error for ${submissionId}: ${error.message}`);
      throw error;
    }
  }

  private async sendResult(submissionId: string, result: SubmissionResultDto) {
    await this.resultQueue.add("submission-processed", result, {
      jobId: submissionId,
      removeOnComplete: { age: 3600, count: 1000 },
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
    });

    this.logger.debug(`Result sent to submission-result queue for ${submissionId}`);
  }
}
