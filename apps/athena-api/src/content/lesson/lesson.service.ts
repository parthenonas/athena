import { Pageable, Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { CreateLessonDto } from "./dto/create.dto";
import { FilterLessonDto } from "./dto/filter.dto";
import { ReadLessonDto } from "./dto/read.dto";
import { UpdateLessonDto } from "./dto/update.dto";
import { Lesson } from "./entities/lesson.entity";
import { BaseService } from "../../base/base.service";
import { IdentityService } from "../../identity";
import { Course } from "../course/entities/course.entity";

/**
 * @class LessonService
 * @description
 * Business logic for managing Lessons (Chapters).
 *
 * Responsibilities:
 * - CRUD for lessons
 * - Automatic ordering (if order is not provided)
 * - Linking to parent Course
 * - ACL enforcement via IdentityService (delegated to parent Course)
 */
@Injectable()
export class LessonService extends BaseService<Lesson> {
  private readonly logger = new Logger(LessonService.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly repo: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    private readonly identityService: IdentityService,
  ) {
    super();
  }

  /**
   * Returns paginated list of lessons.
   * Supports filtering by CourseID.
   */
  async findAll(
    filters: FilterLessonDto,
    userId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<Pageable<ReadLessonDto>> {
    const { page, limit, search, sortBy, sortOrder, courseId } = filters;

    this.logger.log(`findAll() | courseId=${courseId}, page=${page}, limit=${limit}, search="${search}"`);

    try {
      const qb = this.repo.createQueryBuilder("l");
      qb.leftJoinAndSelect("l.course", "c");
      this.identityService.applyPoliciesToQuery(qb, userId, appliedPolicies, "c");

      if (courseId) {
        qb.andWhere("l.courseId = :courseId", { courseId });
      }

      if (search?.trim()) {
        qb.andWhere("l.title ILIKE :q", { q: `%${search.trim()}%` });
      }

      const sortField = sortBy ? `l.${sortBy}` : "l.order";
      qb.orderBy(sortField, sortOrder.toUpperCase() as "ASC" | "DESC");

      qb.skip((page - 1) * limit).take(limit);

      const [entities, total] = await qb.getManyAndCount();
      const data = this.toDtoArray(entities, ReadLessonDto);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: unknown) {
      this.logger.error(`findAll() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to fetch lessons");
    }
  }

  /**
   * Returns a single lesson by UUID.
   */
  async findOne(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<ReadLessonDto> {
    this.logger.log(`findOne() | id=${id}`);

    try {
      const lesson = await this.repo.findOne({
        where: { id },
        relations: ["course"],
      });

      if (!lesson) {
        this.logger.warn(`findOne() | Lesson not found | id=${id}`);
        throw new NotFoundException("Lesson not found");
      }

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, lesson.course)) {
          throw new ForbiddenException("You are not allowed to view this lesson");
        }
      }

      return this.toDto(lesson, ReadLessonDto);
    } catch (err: unknown) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      this.logger.error(`findOne() | ${(err as Error).message}`, (err as Error).stack);
      throw new BadRequestException("Failed to fetch lesson");
    }
  }

  /**
   * Creates a new lesson.
   */
  async create(dto: CreateLessonDto, userId: string): Promise<ReadLessonDto> {
    this.logger.log(`create() | title="${dto.title}", courseId=${dto.courseId}`);

    try {
      const course = await this.courseRepo.findOne({ where: { id: dto.courseId } });
      if (!course) {
        throw new NotFoundException("Parent course not found");
      }

      if (course.ownerId !== userId) {
        throw new ForbiddenException("You can only add lessons to your own courses");
      }

      let order = dto.order;
      if (order === undefined) {
        const maxOrderResult = await this.repo
          .createQueryBuilder("l")
          .select("MAX(l.order)", "max")
          .where("l.courseId = :courseId", { courseId: dto.courseId })
          .getRawOne();

        const maxOrder = maxOrderResult?.max ?? 0;
        order = Math.floor(maxOrder) + 1;
      }

      const entity = this.repo.create({
        title: dto.title,
        goals: dto.goals ?? null,
        order: order,
        isDraft: dto.isDraft ?? true,
        courseId: dto.courseId,
      });

      const saved = await this.repo.save(entity);

      return this.toDto(saved, ReadLessonDto);
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;

      this.logger.error(`create() | ${(error as Error).message}`, (error as Error).stack);

      if (error instanceof QueryFailedError) {
        this.handleLessonConstraintError(error);
      }

      throw new BadRequestException("Failed to create lesson");
    }
  }

  /**
   * Updates a lesson.
   */
  async update(
    id: string,
    dto: UpdateLessonDto,
    userId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<ReadLessonDto> {
    this.logger.log(`update() | id=${id}`);

    try {
      const lesson = await this.repo.findOne({ where: { id }, relations: ["course"] });
      if (!lesson) throw new NotFoundException("Lesson not found");

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, lesson.course)) {
          throw new ForbiddenException("You are not allowed to update this lesson");
        }
      }

      if (dto.title !== undefined) lesson.title = dto.title;
      if (dto.goals !== undefined) lesson.goals = dto.goals;
      if (dto.order !== undefined) lesson.order = dto.order;
      if (dto.isDraft !== undefined) lesson.isDraft = dto.isDraft;

      const updated = await this.repo.save(lesson);
      return this.toDto(updated, ReadLessonDto);
    } catch (error: unknown) {
      this.logger.error(`update() | ${(error as Error).message}`, (error as Error).stack);

      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      if (error instanceof QueryFailedError) {
        this.handleLessonConstraintError(error);
      }

      throw new BadRequestException("Failed to update lesson");
    }
  }

  /**
   * Soft deletes a lesson.
   */
  async softDelete(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<void> {
    this.logger.log(`softDelete() | id=${id}`);

    const lesson = await this.repo.findOne({ where: { id }, relations: ["course"] });
    if (!lesson) throw new NotFoundException("Lesson not found");

    for (const policy of appliedPolicies) {
      if (!this.identityService.checkAbility(policy, userId, lesson.course)) {
        throw new ForbiddenException("You are not allowed to delete this lesson");
      }
    }

    try {
      const res = await this.repo.softDelete(id);
      if (!res.affected) throw new NotFoundException("Lesson not found");

      this.logger.log(`softDelete() | Lesson deleted | id=${id}`);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;

      this.logger.error(`softDelete() | ${(err as Error).message}`, (err as Error).stack);
      throw new BadRequestException("Failed to delete lesson");
    }
  }

  /**
   * Handle DB constraints.
   */
  private handleLessonConstraintError(_: QueryFailedError): never {
    throw new BadRequestException("Failed to persist lesson");
  }
}
