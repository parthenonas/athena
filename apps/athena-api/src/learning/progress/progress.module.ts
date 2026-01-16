import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ProgressInitializedHandler } from "./application/application/events/handlers/progress-initialized.handler";
import { InitializeProgressHandler } from "./application/commands/handlers/initialize-progress.handler";
import { PROGRESS_REPOSITORY } from "./domain/repository/progress.repository";
import { ProgressOrmEntity } from "./infrastructure/persistence/entities/progress.orm.entity";
import {
  StudentDashboard,
  StudentDashboardSchema,
} from "./infrastructure/persistence/mongo/schemas/student-dashboard.schema";
import { TypeOrmProgressRepository } from "./infrastructure/persistence/repositories/typeorm-progress.repository";
import { ProgressEventListener } from "./presentation/progress.listener";

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([ProgressOrmEntity]),
    MongooseModule.forFeature([{ name: StudentDashboard.name, schema: StudentDashboardSchema }]),
  ],
  providers: [
    {
      provide: PROGRESS_REPOSITORY,
      useClass: TypeOrmProgressRepository,
    },
    InitializeProgressHandler,
    ProgressInitializedHandler,
    ProgressEventListener,
  ],
  controllers: [],
})
export class ProgressModule {}
