import { PostgresErrorCode } from "@athena/common";
import { Pageable } from "@athena/types";
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { CreateCourseDto } from "./dto/create.dto";
import { FilterCourseDto } from "./dto/filter.dto";
import { ReadCourseDto } from "./dto/read.dto";
import { UpdateCourseDto } from "./dto/update.dto";
import { Course } from "./entities/course.entity";
import { BaseService } from "../../base/base.service";
import { isPostgresQueryError } from "../../shared/helpers/errors";

/**
 * @class CourseService
 * @description
 * Business logic for managing Courses.
 *
 * Responsibilities:
 * - CRUD for courses
 * - Pagination and search
 * - Unique title validation (optional future constraint)
 * - Safe serialization using BaseService
 * - Soft deletion
 *
 * This domain is STRICT CRUD. No business rules here.
 * All heavy stuff (progress, unlocking, attempts, submissions)
 * will live in the "Learning" (or "Submission") bounded context.
 */
@Injectable()
export class CourseService extends BaseService<Course> {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    @InjectRepository(Course)
    private readonly repo: Repository<Course>,
  ) {
    super();
  }

  /**
   * Returns paginated list of courses.
   */
  async findAll(filters: FilterCourseDto): Promise<Pageable<ReadCourseDto>> {
    const { page, limit, search, sortBy, sortOrder } = filters;

    this.logger.log(`findAll() | page=${page}, limit=${limit}, search="${search}", sort=${sortBy} ${sortOrder}`);

    try {
      const qb = this.repo.createQueryBuilder("c");

      if (search?.trim()) {
        qb.andWhere("c.title ILIKE :q", { q: `%${search.trim()}%` });
      }

      qb.orderBy(`c.${sortBy}`, sortOrder.toUpperCase() as "ASC" | "DESC");
      qb.skip((page - 1) * limit).take(limit);

      const [entities, total] = await qb.getManyAndCount();
      const data = this.toDtoArray(entities, ReadCourseDto);

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
      throw new BadRequestException("Failed to fetch courses");
    }
  }

  /**
   * Returns a single course by UUID.
   */
  async findOne(id: string): Promise<ReadCourseDto> {
    this.logger.log(`findOne() | id=${id}`);

    try {
      const course = await this.repo.findOne({ where: { id } });
      if (!course) {
        this.logger.warn(`findOne() | Course not found | id=${id}`);
        throw new NotFoundException("Course not found");
      }

      return this.toDto(course, ReadCourseDto);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`findOne() | ${(err as Error).message}`, (err as Error).stack);
      throw new BadRequestException("Failed to fetch course");
    }
  }

  /**
   * Creates a course.
   */
  async create(dto: CreateCourseDto): Promise<ReadCourseDto> {
    this.logger.log(`create() | title="${dto.title}"`);

    try {
      const entity = this.repo.create({
        title: dto.title,
        description: dto.description ?? null,
        ownerId: dto.ownerId,
        tags: dto.tags ?? [],
        isPublished: dto.isPublished ?? false,
      });

      const saved = await this.repo.save(entity);

      return this.toDto(saved, ReadCourseDto);
    } catch (error: unknown) {
      this.logger.error(`create() | ${(error as Error).message}`, (error as Error).stack);

      if (error instanceof QueryFailedError) {
        this.handleCourseConstraintError(error);
      }

      throw new BadRequestException("Failed to create course");
    }
  }

  /**
   * Updates a course.
   */
  async update(id: string, dto: UpdateCourseDto): Promise<ReadCourseDto> {
    this.logger.log(`update() | id=${id}`);

    try {
      const course = await this.repo.findOne({ where: { id } });
      if (!course) throw new NotFoundException("Course not found");

      if (dto.title !== undefined) course.title = dto.title;
      if (dto.description !== undefined) course.description = dto.description;
      if (dto.ownerId !== undefined) course.ownerId = dto.ownerId;
      if (dto.tags !== undefined) course.tags = dto.tags;
      if (dto.isPublished !== undefined) course.isPublished = dto.isPublished;

      const updated = await this.repo.save(course);
      return this.toDto(updated, ReadCourseDto);
    } catch (error: unknown) {
      this.logger.error(`update() | ${(error as Error).message}`, (error as Error).stack);

      if (error instanceof NotFoundException) throw error;
      if (error instanceof QueryFailedError) {
        this.handleCourseConstraintError(error);
      }

      throw new BadRequestException("Failed to update course");
    }
  }

  /**
   * Soft deletes a course.
   */
  async softDelete(id: string): Promise<void> {
    this.logger.log(`softDelete() | id=${id}`);

    try {
      const res = await this.repo.softDelete(id);
      if (!res.affected) throw new NotFoundException("Course not found");

      this.logger.log(`softDelete() | Course deleted | id=${id}`);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;

      this.logger.error(`softDelete() | ${(err as Error).message}`, (err as Error).stack);
      throw new BadRequestException("Failed to delete course");
    }
  }

  /**
   * Maps raw PostgreSQL constraint violations to HTTP exceptions.
   * Allows adding unique constraints later easily.
   */
  private handleCourseConstraintError(error: QueryFailedError): never {
    if (isPostgresQueryError(error)) {
      const { code, constraint } = error;

      if (code === PostgresErrorCode.UNIQUE_VIOLATION && constraint === "courses__title__uk") {
        throw new ConflictException("Course with such parameters already exists");
      }
    }

    throw new BadRequestException("Failed to persist course");
  }
}
