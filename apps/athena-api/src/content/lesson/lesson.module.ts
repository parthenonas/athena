import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { IdentityModule } from "../../identity";
import { Lesson } from "./entities/lesson.entity";
import { LessonService } from "./lesson.service";
import { Block } from "../block/entities/block.entity";
import { Course } from "../course/entities/course.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, Course, Block]), IdentityModule],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}
