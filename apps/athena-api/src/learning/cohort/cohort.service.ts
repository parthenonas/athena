import { Pageable, Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CreateCohortDto } from "./dto/create.dto";
import { FilterCohortDto } from "./dto/filter.dto";
import { ReadCohortDto } from "./dto/read.dto";
import { UpdateCohortDto } from "./dto/update.dto";
import { Cohort } from "./entities/cohort.entity";
import { BaseService } from "../../base/base.service";
import { IdentityService } from "../../identity";

/**
 * @class CohortService
 * @description
 * Business logic for managing Study Cohorts (Groups).
 *
 * Responsibilities:
 * - CRUD for cohorts
 * - Assigning instructors to groups
 * - Filtering cohorts by instructor
 * - Policy-based access control (e.g. instructor sees only their cohorts)
 */
@Injectable()
export class CohortService extends BaseService<Cohort> {
  private readonly logger = new Logger(CohortService.name);

  constructor(
    @InjectRepository(Cohort)
    private readonly repo: Repository<Cohort>,
    private readonly identityService: IdentityService,
  ) {
    super();
  }

  /**
   * Returns paginated list of cohorts.
   */
  async findAll(
    filters: FilterCohortDto,
    userId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<Pageable<ReadCohortDto>> {
    const { page, limit, search, instructorId, sortBy, sortOrder } = filters;
    this.logger.log(`findAll() | page=${page}, limit=${limit}, search="${search}", sort=${sortBy} ${sortOrder}`);
    try {
      const qb = this.repo.createQueryBuilder("c");
      qb.leftJoinAndSelect("c.instructor", "i");
      this.identityService.applyPoliciesToQuery(qb, userId, appliedPolicies, "i");

      if (search?.trim()) {
        qb.andWhere("c.name ILIKE :q", { q: `%${search.trim()}%` });
      }
      if (instructorId) {
        qb.andWhere("c.instructorId = :iId", { iId: instructorId });
      }

      qb.orderBy(`c.${sortBy}`, sortOrder.toUpperCase() as "ASC" | "DESC");
      qb.skip((page - 1) * limit).take(limit);

      const [entities, total] = await qb.getManyAndCount();

      return {
        data: this.toDtoArray(entities, ReadCohortDto),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      this.logger.error(`findAll error: ${(error as Error).message}`);
      throw new BadRequestException("Failed to fetch cohorts");
    }
  }

  /**
   * Returns a single cohort by UUID.
   */
  async findOne(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<ReadCohortDto> {
    this.logger.log(`findOne() | id=${id}`);

    try {
      const cohort = await this.repo.findOne({
        where: { id },
        relations: ["instructor"],
      });

      if (!cohort) {
        this.logger.warn(`findOne() | Cohort not found | id=${id}`);
        throw new NotFoundException("Cohort not found");
      }

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, cohort)) {
          throw new ForbiddenException("You are not allowed to view this cohort");
        }
      }

      return this.toDto(cohort, ReadCohortDto);
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      throw new BadRequestException("Failed to fetch cohort");
    }
  }

  /**
   * Creates a new cohort.
   */
  async create(dto: CreateCohortDto): Promise<ReadCohortDto> {
    this.logger.log(`create() | name="${dto.name}"`);

    try {
      const entity = this.repo.create({
        name: dto.name,
        instructorId: dto.instructorId,
        startDate: dto.startDate,
        endDate: dto.endDate,
      });

      const saved = await this.repo.save(entity);
      return this.toDto(saved, ReadCohortDto);
    } catch (error: unknown) {
      this.logger.error(`create() | ${(error as Error).message}`, (error as Error).stack);
      // Если добавим уникальность по имени, тут пригодится хендлер
      throw new BadRequestException("Failed to create cohort");
    }
  }

  /**
   * Updates a cohort.
   */
  async update(id: string, dto: UpdateCohortDto): Promise<ReadCohortDto> {
    this.logger.log(`update() | id=${id}`);

    try {
      const cohort = await this.repo.findOne({ where: { id } });
      if (!cohort) throw new NotFoundException("Cohort not found");

      if (dto.name !== undefined) cohort.name = dto.name;
      if (dto.instructorId !== undefined) cohort.instructorId = dto.instructorId;
      if (dto.startDate !== undefined) cohort.startDate = dto.startDate;
      if (dto.endDate !== undefined) cohort.endDate = dto.endDate;

      const updated = await this.repo.save(cohort);
      return this.toDto(updated, ReadCohortDto);
    } catch (error: unknown) {
      this.logger.error(`update() | ${(error as Error).message}`, (error as Error).stack);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException("Failed to update cohort");
    }
  }

  /**
   * Deletes a cohort.
   */
  async delete(id: string): Promise<void> {
    this.logger.log(`delete() | id=${id}`);

    const cohort = await this.repo.findOne({ where: { id } });
    if (!cohort) throw new NotFoundException("Cohort not found");

    try {
      await this.repo.remove(cohort);
      this.logger.log(`delete() | Cohort deleted | id=${id}`);
    } catch (err: unknown) {
      this.logger.error(`delete() | ${(err as Error).message}`, (err as Error).stack);
      throw new BadRequestException("Failed to delete cohort");
    }
  }
}
