import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { SubmissionQueueService } from "./submission-queue.service";
import { SubmissionResultProcessor } from "./submission-result.processor";

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueueAsync({
      name: "execution",
      useFactory: (config: ConfigService) => ({
        name: config.get("EXECUTION_QUEUE_NAME") || "execution",
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: "submission-result",
      useFactory: (config: ConfigService) => ({
        name: config.get("SUBMISSION_RESULT_QUEUE_NAME") || "submission-result",
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SubmissionQueueService, SubmissionResultProcessor],
  exports: [SubmissionQueueService],
})
export class SubmissionQueueModule {}
