import { InjectQueue } from "@nestjs/bullmq";
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Queue } from "bullmq";

import { JobStatusResponseDto } from "./dto/job-status-response.dto";
import { RunnerJobDataDto } from "./dto/runner-job-data.dto";
import { SubmissionResultDto } from "./dto/submission-result.dto";

@Controller("submission")
export class SubmissionController {
  constructor(
    @InjectQueue("execution") private readonly executionQueue: Queue,
    @Inject("execution") private readonly queueName: string,
  ) {}

  /**
   * Health Check endpoint.
   * Verifies that the application is up and the Redis connection is ready.
   * * @throws ServiceUnavailableException if Redis is not ready.
   */
  @Get("health")
  async health() {
    const isRedisReady = (await this.executionQueue.client).status === "ready";

    if (!isRedisReady) {
      throw new ServiceUnavailableException({
        status: "error",
        message: "Redis connection is down",
        queue: this.queueName,
      });
    }

    return {
      status: "ok",
      worker: "athena-runner",
      queue: this.queueName,
      redis: "ready",
    };
  }

  /**
   * Manual Submission Trigger.
   * Enqueues a job for execution immediately.
   */
  @Post()
  async createSubmission(@Body() dto: RunnerJobDataDto) {
    const job = await this.executionQueue.add("run-code", dto, {
      attempts: 1,
      jobId: dto.submissionId,
    });

    return {
      message: "Submission queued",
      jobId: job.id,
      submissionId: dto.submissionId,
    };
  }

  /**
   * Retrieves the full job status and result.
   * * @param jobId The BullMQ Job ID (returned from the POST /submission).
   */
  @Get(":id")
  async getStatus(@Param("id") jobId: string): Promise<JobStatusResponseDto> {
    const job = await this.executionQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found in Redis`);
    }

    const state = await job.getState();
    const result = job.returnvalue as SubmissionResultDto;
    const submissionId = result?.submissionId || job.data?.submissionId;

    return {
      jobId: job.id!,
      submissionId: submissionId,
      state,
      result: state === "completed" ? result : undefined,
      error: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }
}
