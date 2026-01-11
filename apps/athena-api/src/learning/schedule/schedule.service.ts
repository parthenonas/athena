import { PostgresErrorCode } from "@athena/common";
import { Pageable, Policy } from "@athena/types";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { CreateScheduleDto } from "./dto/create.dto";
import { FilterScheduleDto } from "./dto/filter.dto";
import { ReadScheduleDto } from "./dto/read.dto";
import { UpdateScheduleDto } from "./dto/update.dto";
import { Schedule } from "./entities/schedule.entity";
import { BaseService } from "../../base/base.service";
import { IdentityService } from "../../identity";
import { isPostgresQueryError } from "../../shared/helpers/errors";

/**
 * @class ScheduleService
 * @description
 * Business logic for managing the Lesson Schedule.
 *
 * Responsibilities:
 * - Linking Lessons to Cohorts with time windows.
 * - Managing overrides (manual open, config overrides).
 * - Enforcing uniqueness (One lesson per cohort).
 * - Access control: Inherits permissions from the Cohort's Instructor.
 */
@Injectable()
export class ScheduleService extends BaseService<Schedule> {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly repo: Repository<Schedule>,
    private readonly identityService: IdentityService,
  ) {
    super();
  }

  /**
   * Returns paginated schedule entries.
   * Joins Cohort and Instructor to allow filtering by owner permissions.
   */
  async findAll(
    filters: FilterScheduleDto,
    userId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<Pageable<ReadScheduleDto>> {
    const { page, limit, cohortId, lessonId, sortBy, sortOrder } = filters;
    this.logger.log(`findAll() | user=${userId}, cohort=${cohortId}`);

    try {
      const qb = this.repo.createQueryBuilder("s");

      // Join cohort and instructor to verify ownership (OWN_ONLY policy)
      qb.leftJoinAndSelect("s.cohort", "c");
      qb.leftJoinAndSelect("c.instructor", "i");

      this.identityService.applyPoliciesToQuery(qb, userId, appliedPolicies, "i");

      if (cohortId) {
        qb.andWhere("s.cohortId = :cId", { cId: cohortId });
      }
      if (lessonId) {
        qb.andWhere("s.lessonId = :lId", { lId: lessonId });
      }

      qb.orderBy(`s.${sortBy}`, sortOrder.toUpperCase() as "ASC" | "DESC");
      qb.skip((page - 1) * limit).take(limit);

      const [entities, total] = await qb.getManyAndCount();

      return {
        data: this.toDtoArray(entities, ReadScheduleDto),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      this.logger.error(`findAll error: ${(error as Error).message}`);
      throw new BadRequestException("Failed to fetch schedules");
    }
  }

  /**
   * Returns a single schedule entry.
   * Validates access based on the associated Cohort.
   */
  async findOne(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<ReadScheduleDto> {
    try {
      const schedule = await this.repo.findOne({
        where: { id },
        relations: ["cohort", "cohort.instructor"],
      });

      if (!schedule) {
        throw new NotFoundException("Schedule not found");
      }

      for (const policy of appliedPolicies) {
        // Schedule belongs to a Cohort, so we check permissions on the Cohort
        if (!this.identityService.checkAbility(policy, userId, schedule.cohort)) {
          throw new ForbiddenException("Access denied");
        }
      }

      return this.toDto(schedule, ReadScheduleDto);
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      throw new BadRequestException("Failed to fetch schedule");
    }
  }

  /**
   * Creates a new schedule entry.
   * Ensures a lesson is not added twice to the same cohort.
   */
  async create(dto: CreateScheduleDto): Promise<ReadScheduleDto> {
    try {
      const entity = this.repo.create({
        cohortId: dto.cohortId,
        lessonId: dto.lessonId,
        startAt: dto.startAt,
        endAt: dto.endAt,
        isOpenManually: dto.isOpenManually,
        configOverrides: dto.configOverrides,
      });

      const saved = await this.repo.save(entity);
      return this.toDto(saved, ReadScheduleDto);
    } catch (error) {
      this.logger.error(`create error: ${(error as Error).message}`);
      if (error instanceof QueryFailedError) {
        this.handleScheduleConstraintError(error);
      }
      throw new BadRequestException("Failed to create schedule");
    }
  }

  /**
   * Updates schedule details (dates, overrides).
   */
  async update(id: string, dto: UpdateScheduleDto): Promise<ReadScheduleDto> {
    try {
      const schedule = await this.repo.findOne({ where: { id } });
      if (!schedule) throw new NotFoundException("Schedule not found");

      if (dto.startAt !== undefined) schedule.startAt = dto.startAt;
      if (dto.endAt !== undefined) schedule.endAt = dto.endAt;
      if (dto.isOpenManually !== undefined) schedule.isOpenManually = dto.isOpenManually;
      if (dto.configOverrides !== undefined) schedule.configOverrides = dto.configOverrides;

      const updated = await this.repo.save(schedule);
      return this.toDto(updated, ReadScheduleDto);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException("Failed to update schedule");
    }
  }

  /**
   * Deletes a schedule entry.
   */
  async delete(id: string): Promise<void> {
    const schedule = await this.repo.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException("Schedule not found");

    try {
      await this.repo.remove(schedule);
    } catch {
      throw new BadRequestException("Failed to delete schedule");
    }
  }

  /**
   * Maps uniqueness violations to ConflictException.
   */
  private handleScheduleConstraintError(error: QueryFailedError): never {
    if (isPostgresQueryError(error)) {
      const { code, constraint } = error;
      if (code === PostgresErrorCode.UNIQUE_VIOLATION && constraint === "schedules__cohort_lesson__uk") {
        throw new ConflictException("This lesson is already scheduled for this cohort");
      }
    }
    throw new BadRequestException("Failed to create schedule");
  }
}
