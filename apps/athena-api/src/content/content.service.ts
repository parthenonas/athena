import { Injectable } from "@nestjs/common";

import { CourseService } from "./course/course.service";
import { CreateCourseDto } from "./course/dto/create.dto";
import { ReadCourseDto } from "./course/dto/read.dto";

@Injectable()
export class ContentService {
  constructor(private readonly courseService: CourseService) {}

  async createCourse(dto: CreateCourseDto, ownerId: string): Promise<ReadCourseDto> {
    return this.courseService.create(dto, ownerId);
  }
}
