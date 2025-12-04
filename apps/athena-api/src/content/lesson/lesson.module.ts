import { Module } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { IdentityModule } from "../../identity";
import { Lesson } from "./entities/lesson.entity";
import { LessonController } from "./lesson.controller";
import { LessonService } from "./lesson.service";
import { Block } from "../block/entities/block.entity";
import { Course } from "../course/entities/course.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, Course, Block]), IdentityModule, JwtModule],
  providers: [LessonService, JwtService],
  exports: [LessonService],
  controllers: [LessonController],
})
export class LessonModule {}
