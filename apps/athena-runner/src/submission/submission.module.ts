import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { SubmissionController } from './submission.controller';
import { SubmissionProcessor } from './submission.processor';
import { SandboxModule } from '../sandbox/sandbox.module';

@Module({
  imports: [
    SandboxModule,
    ConfigModule,
    BullModule.registerQueueAsync({
      imports: [ConfigModule],
      name: 'execution',
      useFactory: (configService: ConfigService) => ({
        name: configService.get<string>('EXECUTION_QUEUE_NAME') || 'execution',
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      imports: [ConfigModule],
      name: 'submission-result',
      useFactory: (configService: ConfigService) => ({
        name:
          configService.get<string>('SUBMISSION_RESULT_QUEUE_NAME') ||
          'submission-result',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SubmissionController],
  providers: [
    SubmissionProcessor,
    {
      provide: 'execution',
      useFactory: (config: ConfigService) =>
        config.get<string>('EXECUTION_QUEUE_NAME') || 'execution',
      inject: [ConfigService],
    },
  ],
})
export class SubmissionModule {}
