import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SubmissionQueueModule } from "../../submission-queue";
import { GradeBlockHandler } from "./application/commands/handlers/grade-block.handler";
import { InitializeProgressHandler } from "./application/commands/handlers/initialize-progress.handler";
import { SubmitAssignmentHandler } from "./application/commands/handlers/submit-assignment.handler";
import { BlockCompletedHandler } from "./application/events/handlers/block-completed.handler";
import { CourseCompletedHandler } from "./application/events/handlers/course-completed.handler";
import { LessonCompletedHandler } from "./application/events/handlers/lesson-completed.handler";
import { ProgressInitializedHandler } from "./application/events/handlers/progress-initialized.handler";
import { GetStudentProgressHandler } from "./application/queries/handlers/get-student-progress.handler";
import { ProgressSagas } from "./application/sagas/progress.saga";
import { PROGRESS_REPOSITORY } from "./domain/repository/progress.repository";
import { ProgressOrmEntity } from "./infrastructure/persistence/entities/progress.orm.entity";
import {
  StudentDashboard,
  StudentDashboardSchema,
} from "./infrastructure/persistence/mongo/schemas/student-dashboard.schema";
import { TypeOrmProgressRepository } from "./infrastructure/persistence/repositories/typeorm-progress.repository";
import { ProgressEventListener } from "./presentation/progress.listener";
import { ContentModule } from "../../content";
import { CompleteBlockSyncHandler } from "./application/commands/handlers/complete-block-sync.handler";
import { ProgressController } from "./presentation/progress.controller";
import { Enrollment } from "../enrollment/entities/enrollment.entity";
import { GetStudentDashboardHandler } from "./application/queries/handlers/get-student-dashboard.handler";
import { GradingListener } from "./presentation/grading.listener";

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([ProgressOrmEntity, Enrollment]),
    MongooseModule.forFeature([{ name: StudentDashboard.name, schema: StudentDashboardSchema }]),
    SubmissionQueueModule,
    ContentModule,
    JwtModule,
  ],
  providers: [
    {
      provide: PROGRESS_REPOSITORY,
      useClass: TypeOrmProgressRepository,
    },
    InitializeProgressHandler,
    SubmitAssignmentHandler,
    CompleteBlockSyncHandler,
    ProgressInitializedHandler,
    BlockCompletedHandler,
    CourseCompletedHandler,
    LessonCompletedHandler,
    GetStudentProgressHandler,
    GetStudentDashboardHandler,
    GradeBlockHandler,
    ProgressEventListener,
    ProgressSagas,
    GradingListener,
  ],
  controllers: [ProgressController],
})
export class ProgressModule {}
