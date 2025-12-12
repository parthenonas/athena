import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { SandboxModule } from './sandbox/sandbox.module';
import { SubmissionModule } from './submission/submission.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
        removeOnComplete: {
          age: 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 24 * 3600,
          count: 5000,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      imports: [ConfigModule],
      name: 'execution',
      useFactory: (configService: ConfigService) => ({
        name: configService.get<string>('EXECUTION_QUEUE_NAME') || 'execution',
      }),
      inject: [ConfigService],
    }),
    SandboxModule,
    SubmissionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
