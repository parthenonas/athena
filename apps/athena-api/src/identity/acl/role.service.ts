import { PostgresErrorCode } from "@athena/common";
import { PostgresQueryError } from "@athena/types";
import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { CreateRoleDto } from "./dto/create.dto";
import { ReadRoleDto } from "./dto/read.dto";
import { Role } from "./entities/role.entity";
import { BaseService } from "../../base/base.service";

/**
 * @class RoleService
 * @description
 * Handles all operations related to system roles:
 * - creation,
 * - listing,
 * - updating permissions & policies,
 * - safe deletion with FK constraint handling.
 *
 * Extends `BaseService` to provide DTO serialization.
 *
 * ## Responsibilities
 * - CRUD for roles
 * - Protect against deleting roles referenced by accounts
 * - Enforce consistent DTO mapping
 */
@Injectable()
export class RoleService extends BaseService<Role> {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
  ) {
    super();
  }

  /**
   * Finds a role by its name.
   * Returns null if not found.
   */
  async findByName(name: string): Promise<ReadRoleDto | null> {
    this.logger.log(`findByName() | name=${name}`);

    const role = await this.repo.findOne({ where: { name } });
    if (!role) return null;

    return this.toDto(role, ReadRoleDto);
  }

  /**
   * Creates a new role.
   *
   * @throws ConflictException if name already exists
   */
  async create(dto: CreateRoleDto): Promise<ReadRoleDto> {
    this.logger.log(`create() | name=${dto.name}`);

    try {
      const role = this.repo.create({
        name: dto.name,
        permissions: dto.permissions ?? [],
        policies: dto.policies ?? {},
      });

      const saved = await this.repo.save(role);

      this.logger.log(`create() | Role created | id=${saved.id}`);
      return this.toDto(saved, ReadRoleDto);
    } catch (error: unknown) {
      this.logger.error(`create() | ${(error as Error).message}`, (error as Error).stack);
      if (error instanceof QueryFailedError) {
        this.handleRoleConstraintError(error);
      }
      throw new BadRequestException("Failed to create role");
    }
  }

  /**
   * Returns all roles.
   */
  async findAll(): Promise<ReadRoleDto[]> {
    this.logger.log("findAll()");

    const records = await this.repo.find();
    return this.toDtoArray(records, ReadRoleDto);
  }

  /**
   * Gets role by ID.
   *
   * @throws NotFoundException if not exists
   */
  async findById(id: string): Promise<ReadRoleDto> {
    this.logger.log(`findById() | id=${id}`);

    const role = await this.repo.findOne({ where: { id } });

    if (!role) {
      this.logger.warn(`findById() | Role not found | id=${id}`);
      throw new NotFoundException("Role not found");
    }

    return this.toDto(role, ReadRoleDto);
  }

  /**
   * Updates a role's name, permissions or policies.
   *
   * @throws ConflictException if name already exists
   */
  async update(id: string, data: Partial<CreateRoleDto>): Promise<ReadRoleDto> {
    this.logger.log(`update() | id=${id}`);

    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException("Role not found");

    if (data.name !== undefined) existing.name = data.name;
    if (data.permissions !== undefined) existing.permissions = data.permissions;
    if (data.policies !== undefined) existing.policies = data.policies;

    try {
      const saved = await this.repo.save(existing);
      this.logger.log(`update() | Role updated | id=${saved.id}`);
      return this.toDto(saved, ReadRoleDto);
    } catch (error: unknown) {
      this.logger.error(`update() | ${(error as Error).message}`, (error as Error).stack);
      if (error instanceof QueryFailedError) {
        this.handleRoleConstraintError(error);
      }
      throw new BadRequestException("Failed to update role");
    }
  }

  /**
   * Deletes a role by ID.
   * Handles foreign-key constraints (accounts referencing a role).
   *
   * @throws ConflictException if role is used by accounts
   */
  async delete(id: string): Promise<void> {
    this.logger.log(`delete() | id=${id}`);

    try {
      const res = await this.repo.delete(id);

      if (!res.affected) {
        this.logger.warn(`delete() | Role not found | id=${id}`);
        throw new NotFoundException("Role not found");
      }

      this.logger.log(`delete() | Role deleted | id=${id}`);
    } catch (error: unknown) {
      this.logger.error(`delete() | ${(error as Error).message}`, (error as Error).stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof QueryFailedError) {
        this.handleRoleConstraintError(error);
      }
      throw new BadRequestException("Failed to delete role");
    }
  }

  /**
   * Maps low-level PostgreSQL database constraint violations
   * to domain-specific HTTP exceptions.
   *
   * Handles:
   * - unique constraint on role name
   * - FK constraint from accounts.role_id
   */
  private handleRoleConstraintError(error: QueryFailedError): never {
    const pgError = error as QueryFailedError & PostgresQueryError;
    const { code, constraint } = pgError;

    if (code === PostgresErrorCode.UNIQUE_VIOLATION && constraint === "roles__name__uk") {
      throw new ConflictException("Role name already in use");
    }

    if (code === PostgresErrorCode.FOREIGN_KEY_VIOLATION && constraint === "accounts__role_id__fk") {
      throw new ConflictException("Cannot delete role: it is used by existing accounts");
    }

    throw new BadRequestException("Failed to persist role");
  }
}
