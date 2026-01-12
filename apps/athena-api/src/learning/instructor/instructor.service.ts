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
import { Brackets, QueryFailedError, Repository } from "typeorm";

import { CreateInstructorDto } from "./dto/create.dto";
import { FilterInstructorDto } from "./dto/filter.dto";
import { ReadInstructorDto } from "./dto/read.dto";
import { UpdateInstructorDto } from "./dto/update.dto";
import { Instructor } from "./entities/instructor.entity";
import { BaseService } from "../../base/base.service";
import { IdentityService } from "../../identity";
import { isPostgresQueryError } from "../../shared/helpers/errors";

/**
 * @class InstructorService
 * @description
 * Business logic for managing Instructor Profiles.
 *
 * Responsibilities:
 * - CRUD for instructor profiles
 * - Linking profiles to Identity Accounts (OwnerId)
 * - Enforcing one-to-one relationship (Account <-> Instructor)
 * - Searching by bio/title
 */
@Injectable()
export class InstructorService extends BaseService<Instructor> {
  private readonly logger = new Logger(InstructorService.name);

  constructor(
    @InjectRepository(Instructor)
    private readonly repo: Repository<Instructor>,
    private readonly identityService: IdentityService,
  ) {
    super();
  }

  /**
   * Returns paginated list of instructors.
   */
  async findAll(
    filters: FilterInstructorDto,
    userId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<Pageable<ReadInstructorDto>> {
    const { page, limit, search, ownerId, sortBy, sortOrder } = filters;
    this.logger.log(`findAll() | search="${search}"`);

    try {
      const qb = this.repo.createQueryBuilder("i");

      this.identityService.applyPoliciesToQuery(qb, userId, appliedPolicies, "i");

      if (ownerId) {
        qb.andWhere("i.ownerId = :oid", { oid: ownerId });
      }

      if (search?.trim()) {
        qb.andWhere(
          new Brackets(subQb => {
            subQb
              .where("i.bio ILIKE :q", { q: `%${search.trim()}%` })
              .orWhere("i.title ILIKE :q", { q: `%${search.trim()}%` });
          }),
        );
      }

      qb.orderBy(`i.${sortBy}`, sortOrder.toUpperCase() as "ASC" | "DESC");
      qb.skip((page - 1) * limit).take(limit);

      const [entities, total] = await qb.getManyAndCount();

      return {
        data: this.toDtoArray(entities, ReadInstructorDto),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      this.logger.error(`findAll error: ${(error as Error).message}`);
      throw new BadRequestException("Failed to fetch instructors");
    }
  }

  /**
   * Returns a single instructor profile by UUID.
   */
  async findOne(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<ReadInstructorDto> {
    try {
      const instructor = await this.repo.findOne({ where: { id } });

      if (!instructor) {
        throw new NotFoundException("Instructor profile not found");
      }

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, userId, instructor)) {
          throw new ForbiddenException("Access denied");
        }
      }

      return this.toDto(instructor, ReadInstructorDto);
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      throw new BadRequestException("Failed to fetch instructor");
    }
  }

  /**
   * Creates a new instructor profile.
   */
  async create(dto: CreateInstructorDto): Promise<ReadInstructorDto> {
    this.logger.log(`create() | accountId=${dto.ownerId}`);

    await this.identityService.findAccountById(dto.ownerId);

    try {
      const entity = this.repo.create({
        ownerId: dto.ownerId,
        bio: dto.bio,
        title: dto.title,
      });

      const saved = await this.repo.save(entity);
      return this.toDto(saved, ReadInstructorDto);
    } catch (error) {
      this.logger.error(`create error: ${(error as Error).message}`);
      if (error instanceof QueryFailedError) {
        this.handleInstructorConstraintError(error);
      }
      throw new BadRequestException("Failed to create instructor profile");
    }
  }

  /**
   * Updates an instructor profile.
   */
  async update(
    id: string,
    dto: UpdateInstructorDto,
    ownerId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<ReadInstructorDto> {
    try {
      const instructor = await this.repo.findOne({ where: { id } });
      if (!instructor) throw new NotFoundException("Instructor profile not found");

      for (const policy of appliedPolicies) {
        if (!this.identityService.checkAbility(policy, ownerId, instructor)) {
          throw new ForbiddenException("You are not allowed to update this instructor");
        }
      }

      if (dto.bio !== undefined) instructor.bio = dto.bio;
      if (dto.title !== undefined) instructor.title = dto.title;

      const updated = await this.repo.save(instructor);
      return this.toDto(updated, ReadInstructorDto);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      if (error instanceof QueryFailedError) {
        this.handleInstructorConstraintError(error);
      }

      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException("Failed to update instructor");
    }
  }

  /**
   * Deletes an instructor profile.
   */
  async delete(id: string, ownerId: string, appliedPolicies: Policy[] = []): Promise<void> {
    const instructor = await this.repo.findOne({ where: { id } });
    if (!instructor) throw new NotFoundException("Instructor profile not found");

    for (const policy of appliedPolicies) {
      if (!this.identityService.checkAbility(policy, ownerId, instructor)) {
        throw new ForbiddenException("You are not allowed to delete this instructor");
      }
    }

    try {
      await this.repo.remove(instructor);
    } catch (err: unknown) {
      this.logger.error(`delete() | ${(err as Error).message}`, (err as Error).stack);
      throw new BadRequestException("Failed to delete instructor");
    }
  }

  /**
   * Maps raw PostgreSQL constraint violations to HTTP exceptions.
   */
  private handleInstructorConstraintError(error: QueryFailedError): never {
    if (isPostgresQueryError(error)) {
      const { code, constraint } = error;

      if (code === PostgresErrorCode.UNIQUE_VIOLATION && constraint === "instructors__owner_id__uk") {
        throw new ConflictException("Instructor profile already exists for this account");
      }
    }

    throw new BadRequestException("Failed to create instructor profile");
  }
}
