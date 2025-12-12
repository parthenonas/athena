import { randomUUID } from "crypto";

import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";

import { SubmissionPayloadDto } from "./dto/submission-payload.dto";

/**
 * @class SubmissionQueueService
 * @description Service responsible for dispatching code execution requests to the Runner.
 * It acts as a Producer for the 'execution' queue.
 *
 * This service is used by various modules (e.g., Studio, Learn) to offload
 * code execution tasks to the isolated environment.
 */
@Injectable()
export class SubmissionQueueService {
  private readonly logger = new Logger(SubmissionQueueService.name);

  constructor(
    /**
     * Injected BullMQ Queue instance for 'execution'.
     * This queue is monitored by the Athena Runner service.
     */
    @InjectQueue("execution") private executionQueue: Queue,
  ) {}

  /**
   * Sends a submission payload to the execution queue.
   *
   * @param payload - The DTO containing the source code, limits, and metadata.
   * @returns An object containing the submission ID and queue status.
   *
   * @description
   * 1. Generates a `submissionId` if one is not provided (e.g., for dry-runs).
   * 2. Adds the job to the Redis queue with the `submissionId` as the BullMQ Job ID.
   * 3. Configures job retention policy (removeOnComplete) to keep Redis clean.
   */
  async sendForExecution(payload: SubmissionPayloadDto) {
    const submissionId = payload.submissionId || randomUUID();

    this.logger.log(`Queuing submission ${submissionId}`);

    await this.executionQueue.add("run-code", payload, {
      jobId: submissionId,
      removeOnComplete: { age: 3600, count: 1000 },
    });

    return { submissionId, status: "queued" };
  }
}
