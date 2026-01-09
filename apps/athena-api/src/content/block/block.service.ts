import { BlockContent, BlockRequiredAction, BlockType, Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Repository } from "typeorm";
import { v4 as uuid } from "uuid";

import { SubmissionQueueService } from "../../submission-queue";
import {
  CodeBlockContentDto,
  ImageBlockContentDto,
  QuizContentDto,
  SurveyContentDto,
  TextBlockContentDto,
  VideoBlockContentDto,
} from "./dto/content-payload.dto";
import { CreateBlockDto } from "./dto/create.dto";
import { BlockDryRunDto } from "./dto/dry-run.dto";
import { ReadBlockDto } from "./dto/read.dto";
import { ReorderBlockDto, UpdateBlockDto } from "./dto/update.dto";
import { Block } from "./entities/block.entity";
import { BaseService } from "../../base/base.service";
import { IdentityService } from "../../identity";
import { Lesson } from "../lesson/entities/lesson.entity";

/**
 * @class BlockService
 * @description
 * Business logic for managing Content Blocks within a Lesson.
 *
 * Responsibilities:
 * - CRUD for blocks (Text, Video, Code, Quiz, Survey, etc.)
 * - Polymorphic content validation based on BlockType
 * - Managing order via double precision indexing
 * - ACL enforcement via IdentityService (cascading from Course)
 * - DTO transformation via BaseService
 */
@Injectable()
export class BlockService extends BaseService<Block> {
  private readonly logger = new Logger(BlockService.name);

  constructor(
    @InjectRepository(Block)
    private readonly blockRepo: Repository<Block>,
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
    private readonly identityService: IdentityService,
    private readonly submissionQueue: SubmissionQueueService,
  ) {
    super();
  }

  /**
   * Creates a new content block attached to a specific lesson.
   * Checks if the user is the owner of the parent course.
   */
  async create(dto: CreateBlockDto, userId: string): Promise<ReadBlockDto> {
    this.logger.log(`create() | lessonId=${dto.lessonId}, type=${dto.type}, userId=${userId}`);

    try {
      const lesson = await this.lessonRepo.findOne({
        where: { id: dto.lessonId },
        relations: ["course"],
      });

      if (!lesson) {
        throw new NotFoundException(`Lesson with ID ${dto.lessonId} not found`);
      }

      if (lesson.course.ownerId !== userId) {
        throw new ForbiddenException("You can only add blocks to your own courses");
      }

      await this.validateBlockContent(dto.type, dto.content);

      let orderIndex = dto.orderIndex;
      if (orderIndex === undefined) {
        const maxOrderBlock = await this.blockRepo.findOne({
          where: { lessonId: dto.lessonId },
          order: { orderIndex: "DESC" },
        });
        orderIndex = maxOrderBlock ? maxOrderBlock.orderIndex + 1024 : 1024;
      }

      const block = this.blockRepo.create({
        lesson,
        type: dto.type,
        content: dto.content,
        orderIndex,
        requiredAction: dto.requiredAction ?? BlockRequiredAction.VIEW,
      });

      const savedBlock = await this.blockRepo.save(block);
      return this.toDto(savedBlock, ReadBlockDto);
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        throw error;

      this.logger.error(`create() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to create block");
    }
  }

  /**
   * Retrieves all blocks for a given lesson.
   * Verifies read access to the lesson/course.
   */
  async findAllByLesson(lessonId: string, userId: string, appliedPolicies: Policy[] = []): Promise<ReadBlockDto[]> {
    this.logger.log(`findAllByLesson() | lessonId=${lessonId}, userId=${userId}`);

    try {
      const lesson = await this.lessonRepo.findOne({
        where: { id: lessonId },
        relations: ["course"],
      });

      if (!lesson) {
        throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
      }

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, lesson.course)) {
          throw new ForbiddenException("You are not allowed to view blocks in this lesson");
        }
      }

      const blocks = await this.blockRepo.find({
        where: { lessonId },
        order: { orderIndex: "ASC" },
      });

      return this.toDtoArray(blocks, ReadBlockDto);
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      this.logger.error(`findAllByLesson() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to fetch blocks");
    }
  }

  /**
   * Retrieves a single block by UUID.
   * Verifies read access.
   */
  async findOne(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<ReadBlockDto> {
    this.logger.log(`findOne() | id=${id}, userId=${userId}`);

    try {
      const block = await this.blockRepo.findOne({
        where: { id },
        relations: ["lesson", "lesson.course"],
      });

      if (!block) {
        throw new NotFoundException(`Block with ID ${id} not found`);
      }

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, block.lesson.course)) {
          throw new ForbiddenException("You are not allowed to view this block");
        }
      }

      return this.toDto(block, ReadBlockDto);
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      this.logger.error(`findOne() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to fetch block");
    }
  }

  /**
   * Updates an existing block.
   * Verifies edit access.
   */
  async update(id: string, dto: UpdateBlockDto, userId: string, appliedPolicies: Policy[] = []): Promise<ReadBlockDto> {
    this.logger.log(`update() | id=${id}, userId=${userId}`);

    try {
      const block = await this.blockRepo.findOne({
        where: { id },
        relations: ["lesson", "lesson.course"],
      });

      if (!block) throw new NotFoundException(`Block with ID ${id} not found`);

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, block.lesson.course)) {
          throw new ForbiddenException("You are not allowed to update this block");
        }
      }

      const targetType = dto.type || block.type;
      const targetContent = dto.content || block.content;

      if (dto.content || dto.type) {
        await this.validateBlockContent(targetType, targetContent);
      }

      Object.assign(block, dto);

      if (dto.content) {
        block.content = dto.content;
      }

      if (dto.requiredAction) {
        block.requiredAction = dto.requiredAction;
      }

      const savedBlock = await this.blockRepo.save(block);
      return this.toDto(savedBlock, ReadBlockDto);
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      )
        throw error;

      this.logger.error(`update() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to update block");
    }
  }

  /**
   * Updates the order index.
   * Verifies edit access.
   */
  async reorder(
    id: string,
    dto: ReorderBlockDto,
    userId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<ReadBlockDto> {
    this.logger.log(`reorder() | id=${id}, userId=${userId}`);

    try {
      const block = await this.blockRepo.findOne({
        where: { id },
        relations: ["lesson", "lesson.course"],
      });

      if (!block) throw new NotFoundException(`Block with ID ${id} not found`);

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, block.lesson.course)) {
          throw new ForbiddenException("You are not allowed to reorder this block");
        }
      }

      block.orderIndex = dto.newOrderIndex;
      const savedBlock = await this.blockRepo.save(block);
      return this.toDto(savedBlock, ReadBlockDto);
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      this.logger.error(`reorder() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to reorder block");
    }
  }

  /**
   * Removes a block permanently.
   * Verifies delete/edit access.
   */
  async remove(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<void> {
    this.logger.log(`remove() | id=${id}, userId=${userId}`);

    try {
      const block = await this.blockRepo.findOne({
        where: { id },
        relations: ["lesson", "lesson.course"],
      });

      if (!block) throw new NotFoundException(`Block with ID ${id} not found`);

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, block.lesson.course)) {
          throw new ForbiddenException("You are not allowed to delete this block");
        }
      }

      await this.blockRepo.remove(block);
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      this.logger.error(`remove() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to delete block");
    }
  }

  /**
   * Internal Helper: Polymorphic Content Validation.
   */
  private async validateBlockContent(type: BlockType, content: BlockContent): Promise<void> {
    let dtoInstance: object;

    switch (type) {
      case BlockType.Text:
        dtoInstance = plainToInstance(TextBlockContentDto, content);
        break;
      case BlockType.Video:
        dtoInstance = plainToInstance(VideoBlockContentDto, content);
        break;
      case BlockType.Image:
        dtoInstance = plainToInstance(ImageBlockContentDto, content);
        break;
      case BlockType.Code:
        dtoInstance = plainToInstance(CodeBlockContentDto, content);
        break;
      case BlockType.Quiz:
        dtoInstance = plainToInstance(QuizContentDto, content);
        break;
      case BlockType.Survey:
        dtoInstance = plainToInstance(SurveyContentDto, content);
        break;
      default:
        return;
    }

    const errors = await validate(dtoInstance);

    if (errors.length > 0) {
      const messages = errors.map(err => Object.values(err.constraints || {}).join(", ")).join("; ");

      this.logger.warn(`Validation failed for block type ${type}: ${messages}`);
      throw new BadRequestException(`Invalid content for block type ${type}: ${messages}`);
    }
  }

  async dryRun(dto: BlockDryRunDto, userId: string, appliedPolicies: Policy[] = []): Promise<void> {
    this.logger.log(`dryRun() | lessonId=${dto.lessonId}, userId=${userId}`);

    try {
      const lesson = await this.lessonRepo.findOne({
        where: { id: dto.lessonId },
        relations: ["course"],
      });

      if (!lesson) {
        throw new NotFoundException(`Lesson with ID ${dto.lessonId} not found`);
      }

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, lesson.course)) {
          throw new ForbiddenException("You are not allowed to run code in this lesson context");
        }
      }

      await this.submissionQueue.sendForExecution({
        submissionId: uuid(),
        content: dto.content,
        metadata: {
          socketId: dto.socketId,
          lessonId: dto.lessonId,
          blockId: dto.blockId,
        },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      this.logger.error(`dryRun() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to initiate dry run");
    }
  }
}
