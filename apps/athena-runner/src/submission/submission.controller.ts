import { InjectQueue } from '@nestjs/bullmq';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';

import { RunnerJobDataDto } from './dto/runner-job-data.dto';

@Controller('submission')
export class SubmissionController {
  constructor(
    @InjectQueue('execution') private readonly executionQueue: Queue,
    @Inject('EXECUTION_QUEUE_NAME') private readonly queueName: string,
  ) {}

  /**
   * Health Check endpoint for Kubernetes/Docker probes.
   * @returns Service status and queue name.
   */
  @Get('health')
  health() {
    return { status: 'ok', worker: 'athena-runner', queue: this.queueName };
  }

  /**
   * Manual Submission Trigger.
   * Useful for testing the runner without the main API or via Postman.
   *
   * @param dto The job data payload.
   * @returns The job ID and submission ID.
   */
  @Post()
  async createSubmission(@Body() dto: RunnerJobDataDto) {
    const job = await this.executionQueue.add('run-code', dto, {
      attempts: 1,
    });

    return {
      message: 'Submission queued',
      jobId: job.id,
      submissionId: dto.submissionId,
    };
  }

  /**
   * Retrieves the job status directly from Redis.
   * Useful for debugging stuck jobs or checking results manually.
   *
   * @param jobId The BullMQ job ID.
   * @returns Job state, result (if completed), or error reasoning.
   */
  @Get(':id')
  async getStatus(@Param('id') jobId: string) {
    const job = await this.executionQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found in Redis`);
    }

    const state = await job.getState();
    const result = job.returnvalue;
    const error = job.failedReason;

    return {
      jobId: job.id,
      state,
      result,
      error,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }
}
