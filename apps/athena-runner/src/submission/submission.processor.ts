import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { SandboxService } from '../sandbox/sandbox.service';
import { RunnerJobDataDto } from './dto/runner-job-data.dto';
import { SubmissionResultDto } from './dto/submission-result.dto';

@Processor('execution')
@Injectable()
export class SubmissionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionProcessor.name);

  constructor(
    private readonly sandboxService: SandboxService,
    @Inject('EXECUTION_QUEUE_NAME') private readonly queueName: string,
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
  async process(
    job: Job<RunnerJobDataDto, SubmissionResultDto, string>,
  ): Promise<SubmissionResultDto> {
    const { submissionId } = job.data;
    this.logger.log(
      `[${this.queueName}] Processing submission: ${submissionId}`,
    );

    try {
      const result = await this.sandboxService.execute(job.data);

      this.logger.log(
        `[${this.queueName}] Completed submission: ${submissionId} with status ${result.status}`,
      );

      return result;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.logger.error(
        `[${this.queueName}] System Error for ${submissionId}: ${error.message}`,
      );
      throw error;
    }
  }
}
