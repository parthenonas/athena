import { Pageable, Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CreateEnrollmentDto } from "./dto/create.dto";
import { FilterEnrollmentDto } from "./dto/filter.dto";
import { ReadEnrollmentDto } from "./dto/read.dto";
import { UpdateEnrollmentDto } from "./dto/update.dto";
import { Enrollment } from "./entities/enrollment.entity";
import { BaseService } from "../../base/base.service";
import { IdentityService } from "../../identity";

/**
 * @class EnrollmentService
 * @description
 * Business logic for managing Student Enrollments.
 *
 * Responsibilities:
 * - Enrolling students into cohorts
 * - Managing enrollment status (active, expelled, completed)
 * - Policy-based access control (Student sees own, Admin sees all)
 * - Safe serialization using BaseService
 */
@Injectable()
export class EnrollmentService extends BaseService<Enrollment> {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    @InjectRepository(Enrollment)
    private readonly repo: Repository<Enrollment>,
    private readonly identityService: IdentityService,
  ) {
    super();
  }

  /**
   * Returns paginated list of enrollments.
   * Supports filtering by cohort, student owner, or status.
   */
  async findAll(
    filters: FilterEnrollmentDto,
    userId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<Pageable<ReadEnrollmentDto>> {
    const { page, limit, cohortId, ownerId, status, sortBy, sortOrder } = filters;
    this.logger.log(`findAll() | user=${userId}, cohort=${cohortId}`);

    try {
      const qb = this.repo.createQueryBuilder("e");

      this.identityService.applyPoliciesToQuery(qb, userId, appliedPolicies, "e");

      if (cohortId) {
        qb.andWhere("e.cohortId = :cId", { cId: cohortId });
      }
      if (ownerId) {
        qb.andWhere("e.ownerId = :oId", { oId: ownerId });
      }
      if (status) {
        qb.andWhere("e.status = :status", { status });
      }

      qb.orderBy(`e.${sortBy}`, sortOrder.toUpperCase() as "ASC" | "DESC");
      qb.skip((page - 1) * limit).take(limit);

      const [entities, total] = await qb.getManyAndCount();

      return {
        data: this.toDtoArray(entities, ReadEnrollmentDto),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      this.logger.error(`findAll error: ${(error as Error).message}`);
      throw new BadRequestException("Failed to fetch enrollments");
    }
  }

  /**
   * Returns a single enrollment by UUID.
   */
  async findOne(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<ReadEnrollmentDto> {
    try {
      const enrollment = await this.repo.findOne({ where: { id } });

      if (!enrollment) {
        throw new NotFoundException("Enrollment not found");
      }

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, enrollment)) {
          throw new ForbiddenException("Access denied");
        }
      }

      return this.toDto(enrollment, ReadEnrollmentDto);
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      throw new BadRequestException("Failed to fetch enrollment");
    }
  }

  /**
   * Creates a new enrollment (adds student to cohort).
   */
  async create(dto: CreateEnrollmentDto): Promise<ReadEnrollmentDto> {
    try {
      const entity = this.repo.create({
        cohortId: dto.cohortId,
        ownerId: dto.ownerId,
        status: dto.status,
      });

      const saved = await this.repo.save(entity);
      return this.toDto(saved, ReadEnrollmentDto);
    } catch (error) {
      this.logger.error(`create error: ${(error as Error).message}`);
      throw new BadRequestException("Failed to enroll student");
    }
  }

  /**
   * Updates an enrollment (e.g., changing status).
   */
  async update(id: string, dto: UpdateEnrollmentDto): Promise<ReadEnrollmentDto> {
    try {
      const enrollment = await this.repo.findOne({ where: { id } });
      if (!enrollment) throw new NotFoundException("Enrollment not found");

      if (dto.status) enrollment.status = dto.status;

      const updated = await this.repo.save(enrollment);
      return this.toDto(updated, ReadEnrollmentDto);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException("Failed to update enrollment");
    }
  }

  /**
   * Deletes an enrollment.
   */
  async delete(id: string): Promise<void> {
    const enrollment = await this.repo.findOne({ where: { id } });
    if (!enrollment) throw new NotFoundException("Enrollment not found");

    try {
      await this.repo.remove(enrollment);
    } catch {
      throw new BadRequestException("Failed to delete enrollment");
    }
  }
}
