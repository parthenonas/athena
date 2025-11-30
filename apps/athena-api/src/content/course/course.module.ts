import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CourseService } from "./course.service";
import { Course } from "./entities/course.entity";
import { IdentityModule } from "../../identity";
import { Lesson } from "../lesson/entities/lesson.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Course, Lesson]), IdentityModule],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
