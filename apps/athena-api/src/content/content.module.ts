import { Module } from "@nestjs/common";

import { BlockModule } from "./block/block.module";
import { ContentService } from "./content.service";
import { CourseModule } from "./course/course.module";
import { LessonModule } from "./lesson/lesson.module";

@Module({
  imports: [CourseModule, LessonModule, BlockModule],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
