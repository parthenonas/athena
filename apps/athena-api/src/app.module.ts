import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ContentModule } from "./content";
import { IdentityModule } from "./identity";
import { LearningModule } from "./learning";
import { MediaModule } from "./media";
import { NotificationModule } from "./notification";
import { OutboxModule } from "./outbox";
import { SharedModule } from "./shared/shared.module";
import { SubmissionQueueModule } from "./submission-queue";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DATABASE_HOST"),
        port: configService.get("DATABASE_PORT"),
        username: configService.get("DATABASE_USERNAME"),
        password: configService.get("DATABASE_PASSWORD"),
        database: configService.get("DATABASE_NAME"),
        synchronize: configService.get("TEST_E2E") === "true",
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get("REDIS_HOST"),
          port: cfg.get("REDIS_PORT"),
        },
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    IdentityModule,
    ContentModule,
    SubmissionQueueModule,
    NotificationModule,
    MediaModule,
    LearningModule,
    OutboxModule,
  ],
})
export class AppModule {}
