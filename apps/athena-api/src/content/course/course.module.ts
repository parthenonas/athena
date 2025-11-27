import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CourseService } from "./course.service";
import { Course } from "./entities/course.entity";
import { Lesson } from "../lesson/entities/lesson.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Course, Lesson])],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
