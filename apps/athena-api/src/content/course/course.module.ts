import { Module } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CourseController } from "./course.controller";
import { CourseService } from "./course.service";
import { Course } from "./entities/course.entity";
import { IdentityModule } from "../../identity";
import { Lesson } from "../lesson/entities/lesson.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Course, Lesson]), IdentityModule, JwtModule],
  controllers: [CourseController],
  providers: [CourseService, JwtService],
  exports: [CourseService],
})
export class CourseModule {}
