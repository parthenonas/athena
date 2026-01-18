import { BlockType } from "@athena/types";
import { BadRequestException, Injectable } from "@nestjs/common";

import { BlockService } from "./block/block.service";
import { CodeBlockContentDto } from "./block/dto/content-payload.dto";
import { CourseService } from "./course/course.service";
import { CreateCourseDto } from "./course/dto/create.dto";
import { ReadCourseDto } from "./course/dto/read.dto";

@Injectable()
export class ContentService {
  constructor(
    private readonly courseService: CourseService,
    private readonly blockService: BlockService,
  ) {}

  async createCourse(dto: CreateCourseDto, ownerId: string): Promise<ReadCourseDto> {
    return this.courseService.create(dto, ownerId);
  }

  async getCourseById(id: string, userId: string): Promise<ReadCourseDto> {
    return this.courseService.findOne(id, userId);
  }

  async getCodeBlockContext(blockId: string, userId: string): Promise<CodeBlockContentDto> {
    const block = await this.blockService.findOne(blockId, userId);

    if (block.type !== BlockType.Code) {
      throw new BadRequestException(`Block ${blockId} is not a CODE block`);
    }

    return block.content as CodeBlockContentDto;
  }
}
