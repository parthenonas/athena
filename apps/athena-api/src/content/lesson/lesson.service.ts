import { Pageable, Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { InjectRepository } from "@nestjs/typeorm";
import { Model } from "mongoose";
import { DataSource, QueryFailedError, Repository } from "typeorm";

import { CreateLessonDto } from "./dto/create.dto";
import { FilterLessonDto } from "./dto/filter.dto";
import { ReadLessonDto } from "./dto/read.dto";
import { UpdateLessonDto } from "./dto/update.dto";
import { Lesson } from "./entities/lesson.entity";
import { LessonView } from "./schemas/lesson-view.schema";
import { BaseService } from "../../base/base.service";
import { IdentityService } from "../../identity";
import { OutboxService } from "../../outbox";
import { AthenaEvent, LessonCreatedEvent, LessonDeletedEvent, LessonUpdatedEvent } from "../../shared/events/types";
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
    private readonly identityService: IdentityService,
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxService,
    @InjectModel(LessonView.name)
    private readonly lessonViewModel: Model<LessonView>,
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
   * Returns the aggregated Lesson Read Model from MongoDB.
   * Checks ACL policies against the PostgreSQL entity first.
   */
  async findOneView(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<LessonView> {
    this.logger.log(`findOneView() | id=${id}, userId=${userId}`);

    try {
      const lesson = await this.repo.findOne({
        where: { id },
        relations: ["course"],
      });

      if (!lesson) {
        throw new NotFoundException("Lesson not found in primary DB");
      }

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, lesson.course)) {
          throw new ForbiddenException("You are not allowed to view this lesson's content");
        }
      }

      const view = await this.lessonViewModel.findOne({ lessonId: id }).lean().exec();

      if (!view) {
        throw new NotFoundException("Lesson view is still generating or missing");
      }

      return view;
    } catch (err: unknown) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      this.logger.error(`findOneView() | ${(err as Error).message}`, (err as Error).stack);
      throw new BadRequestException("Failed to fetch lesson view");
    }
  }

  /**
   * INTERNAL API: Fetch raw LessonView for other modules.
   * NO ACL CHECKS HERE.
   * The calling module (e.g., Learning) is responsible for stripping
   * sensitive data (correct answers, tests) before sending to the client.
   */
  async findOneInternal(lessonId: string): Promise<LessonView> {
    this.logger.debug(`findOneInternal() | lessonId=${lessonId}`);

    const view = await this.lessonViewModel.findOne({ lessonId }).lean().exec();

    if (!view) {
      this.logger.warn(`Lesson view not found for internal request: ${lessonId}`);
      throw new NotFoundException(`Lesson view ${lessonId} not found`);
    }

    return view;
  }

  /**
   * INTERNAL API: Fetch raw LessonViews for other modules.
   * NO ACL CHECKS HERE.
   * The calling module (e.g., Learning) is responsible for stripping
   * sensitive data (correct answers, tests) before sending to the client.
   */
  async findAllInternal(courseId: string): Promise<Lesson[]> {
    this.logger.debug(`findAllInternal() | courseId=${courseId}`);

    return await this.repo.find({ where: { courseId }, order: { order: "ASC" } });
  }

  /**
   * Creates a new lesson with Outbox Event.
   */
  async create(dto: CreateLessonDto, userId: string): Promise<ReadLessonDto> {
    this.logger.log(`create() | title="${dto.title}", courseId=${dto.courseId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      const course = await manager.findOne(Course, { where: { id: dto.courseId } });
      if (!course) throw new NotFoundException("Parent course not found");
      if (course.ownerId !== userId) throw new ForbiddenException("You can only add lessons to your own courses");

      let order = dto.order;
      if (order === undefined) {
        const maxOrderResult = await manager
          .createQueryBuilder(Lesson, "l")
          .select("MAX(l.order)", "max")
          .where("l.courseId = :courseId", { courseId: dto.courseId })
          .getRawOne();
        order = Math.floor(maxOrderResult?.max ?? 0) + 1;
      }

      const entity = manager.create(Lesson, {
        title: dto.title,
        goals: dto.goals ?? null,
        order: order,
        isDraft: dto.isDraft ?? true,
        courseId: dto.courseId,
      });

      const saved = await manager.save(Lesson, entity);

      const event = new LessonCreatedEvent(
        saved.id,
        saved.courseId,
        saved.title,
        saved.goals || null,
        saved.order,
        saved.isDraft,
      );
      await this.outboxService.save(manager, AthenaEvent.LESSON_CREATED, event);

      await queryRunner.commitTransaction();
      return this.toDto(saved, ReadLessonDto);
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      this.logger.error(`create() | ${(error as Error).message}`, (error as Error).stack);
      if (error instanceof QueryFailedError) this.handleLessonConstraintError(error);
      throw new BadRequestException("Failed to create lesson");
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Updates a lesson with Outbox Event.
   */
  async update(
    id: string,
    dto: UpdateLessonDto,
    userId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<ReadLessonDto> {
    this.logger.log(`update() | id=${id}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      const lesson = await manager.findOne(Lesson, { where: { id }, relations: ["course"] });
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

      const updated = await manager.save(Lesson, lesson);

      const event = new LessonUpdatedEvent(
        updated.id,
        updated.title,
        updated.goals || null,
        updated.order,
        updated.isDraft,
      );
      await this.outboxService.save(manager, AthenaEvent.LESSON_UPDATED, event);

      await queryRunner.commitTransaction();
      return this.toDto(updated, ReadLessonDto);
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`update() | ${(error as Error).message}`, (error as Error).stack);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      if (error instanceof QueryFailedError) this.handleLessonConstraintError(error);
      throw new BadRequestException("Failed to update lesson");
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Soft deletes a lesson with Outbox Event.
   */
  async softDelete(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<void> {
    this.logger.log(`softDelete() | id=${id}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      const lesson = await manager.findOne(Lesson, { where: { id }, relations: ["course"] });
      if (!lesson) throw new NotFoundException("Lesson not found");

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, lesson.course)) {
          throw new ForbiddenException("You are not allowed to delete this lesson");
        }
      }

      const res = await manager.softDelete(Lesson, id);
      if (!res.affected) throw new NotFoundException("Lesson not found");

      const event = new LessonDeletedEvent(id);
      await this.outboxService.save(manager, AthenaEvent.LESSON_DELETED, event);

      await queryRunner.commitTransaction();
      this.logger.log(`softDelete() | Lesson deleted and event emitted | id=${id}`);
    } catch (err: unknown) {
      await queryRunner.rollbackTransaction();
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      this.logger.error(`softDelete() | ${(err as Error).message}`, (err as Error).stack);
      throw new BadRequestException("Failed to delete lesson");
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Handle DB constraints.
   */
  private handleLessonConstraintError(_: QueryFailedError): never {
    throw new BadRequestException("Failed to persist lesson");
  }

  /**
   * ADMIN ONLY: Rebuilds the MongoDB Read Models from PostgreSQL source of truth.
   * Uses Cursor Pagination (Batching) to prevent Out-Of-Memory (OOM) errors on large datasets.
   */
  async syncReadModels(): Promise<{ synced: number }> {
    this.logger.log("Starting forced MongoDB Projection Rebuild from PostgreSQL in batches...");

    await this.lessonViewModel.deleteMany({}).exec();

    let syncedCount = 0;
    let lastId: string | null = null;
    const BATCH_SIZE = 100;

    while (true) {
      const qb = this.repo
        .createQueryBuilder("lesson")
        .leftJoinAndSelect("lesson.blocks", "block")
        .orderBy("lesson.id", "ASC")
        .addOrderBy("block.orderIndex", "ASC")
        .take(BATCH_SIZE);

      if (lastId) {
        qb.where("lesson.id > :lastId", { lastId });
      }

      const lessons = await qb.getMany();

      if (lessons.length === 0) {
        break;
      }

      const documentsToInsert = lessons.map(lesson => ({
        lessonId: lesson.id,
        courseId: lesson.courseId,
        title: lesson.title,
        goals: lesson.goals ?? null,
        order: lesson.order,
        isDraft: lesson.isDraft,
        blocks: lesson.blocks.map(block => ({
          blockId: block.id,
          type: block.type,
          content: block.content,
          orderIndex: block.orderIndex,
          requiredAction: block.requiredAction,
        })),
      }));

      await this.lessonViewModel.insertMany(documentsToInsert);

      syncedCount += lessons.length;
      lastId = lessons[lessons.length - 1].id;

      this.logger.debug(`Synced ${syncedCount} lessons...`);
    }

    this.logger.log(`Successfully synced a total of ${syncedCount} lessons to MongoDB Read Model.`);

    return { synced: syncedCount };
  }
}
