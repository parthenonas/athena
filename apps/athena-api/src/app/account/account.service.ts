import { Pageable, PostgresErrorCode, PostgresQueryError } from "@athena-lms/shared";
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon2 from "argon2";
import { Response } from "express";
import { QueryFailedError, Repository } from "typeorm";

import { BaseService } from "../base/base.service";
import { AccessTokenPayload } from "../types/express";
import { CreateAccountDto } from "./dto/create.dto";
import { FilterAccountDto } from "./dto/filter.dto";
import { ReadAccountDto } from "./dto/read.dto";
import { UpdateAccountDto } from "./dto/update.dto";
import { Account } from "./entities/account.entity";

/**
 * @class AccountService
 * @description
 * Handles all business logic related to the `Account` entity,
 * including CRUD operations, pagination, authentication,
 * and secure token management.
 *
 * This service extends `BaseService`, inheriting utilities
 * for converting entities into DTOs using `class-transformer`
 * while filtering out sensitive fields (e.g. password hashes).
 *
 * ## Responsibilities:
 * - Manage account creation, updates, and deletion
 * - Enforce login uniqueness
 * - Hash passwords before persistence
 * - Validate credentials during authentication
 * - Generate access/refresh tokens and manage cookies
 * - Provide paginated and filtered account queries
 *
 * @example
 * ```ts
 * const accounts = await accountService.findAll({ page: 1, limit: 20 });
 * const account = await accountService.findOne("uuid");
 * const created = await accountService.create(dto);
 * const token = accountService.generateAccessToken(account);
 * ```
 */
@Injectable()
export class AccountService extends BaseService<Account> {
  private readonly logger = new Logger(AccountService.name);

  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    super();
    this.accessTtl = this.config.get<number>("JWT_ACCESS_TTL_SECONDS", 900);
    this.refreshTtl = this.config.get<number>("JWT_REFRESH_TTL_SECONDS", 604800);
    this.accessSecret = this.config.get<string>("JWT_ACCESS_SECRET", "");
    this.refreshSecret = this.config.get<string>("JWT_REFRESH_SECRET", "");
  }

  /**
   * Retrieves a paginated list of accounts with optional filters.
   *
   * Supports search by login, filtering by role and active status,
   * and sorting by any allowed column.
   *
   * @param filters - Query parameters including pagination and filtering options
   * @returns Paginated list of accounts serialized as `ReadAccountDto`
   *
   * @throws {BadRequestException} if database query fails
   */
  async findAll(filters: FilterAccountDto): Promise<Pageable<ReadAccountDto>> {
    const { page, limit, sortBy, sortOrder, search } = filters;
    this.logger.log(`findAll() | page=${page}, limit=${limit}, search="${search}"`);

    try {
      const qb = this.repo.createQueryBuilder("a");

      if (search?.trim()) qb.andWhere("a.login ILIKE :search", { search: `%${search.trim()}%` });

      qb.orderBy(`a.${sortBy}`, sortOrder.toUpperCase() as "ASC" | "DESC");
      qb.skip((page - 1) * limit).take(limit);

      const [entities, total] = await qb.getManyAndCount();
      const data = this.toDtoArray(entities, ReadAccountDto);

      this.logger.log(`findAll() | Found ${data.length} accounts (total=${total})`);

      return {
        data,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    } catch (error: unknown) {
      this.logger.error(`findAll() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to fetch accounts");
    }
  }

  /**
   * Retrieves a single account by its unique identifier.
   *
   * @param id - The account UUID
   * @returns Account as `ReadAccountDto`
   *
   * @throws {NotFoundException} if account does not exist
   * @throws {BadRequestException} if query fails
   */
  async findOne(id: string): Promise<ReadAccountDto> {
    this.logger.log(`findOne() | id=${id}`);

    try {
      const account = await this.repo.findOne({
        where: { id },
      });

      if (!account) {
        this.logger.warn(`findOne() | Account not found | id=${id}`);
        throw new NotFoundException("Account not found");
      }

      return this.toDto(account, ReadAccountDto);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`findOne() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to fetch account");
    }
  }

  /**
   * Retrieves a single account by its unique identifier.
   *
   * @param login - The account login
   * @returns Account as `ReadAccountDto`
   *
   * @throws {NotFoundException} if account does not exist
   * @throws {BadRequestException} if query fails
   */
  async findOneByLogin(login: string): Promise<ReadAccountDto> {
    this.logger.log(`findOneByLogin() | login=${login}`);

    try {
      const account = await this.repo.findOne({
        where: { login },
      });

      if (!account) {
        this.logger.warn(`findOneByLogin() | Account not found | login=${login}`);
        throw new NotFoundException("Account not found");
      }

      return this.toDto(account, ReadAccountDto);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`findOneByLogin() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to fetch account");
    }
  }

  /**
   * Creates a new account (typically via admin panel).
   *
   * - Validates login uniqueness
   * - Hashes password securely using Argon2
   * - Returns safe DTO without password field
   *
   * @param dto - Data for account creation
   * @returns Created account as `ReadAccountDto`
   *
   * @throws {ConflictException} if login already exists
   * @throws {BadRequestException} if persistence fails
   */
  async create(dto: CreateAccountDto): Promise<ReadAccountDto> {
    this.logger.log(`create() | login=${dto.login}`);

    try {
      const passwordHash = await argon2.hash(dto.password);
      const entity = this.repo.create({
        login: dto.login,
        passwordHash,
        roleId: dto.roleId,
      });

      const saved = await this.repo.save(entity);
      this.logger.log(`create() | Account created | id=${saved.id}`);
      return this.toDto(saved, ReadAccountDto);
    } catch (error: unknown) {
      this.logger.error(`create() | ${(error as Error).message}`, (error as Error).stack);
      if (error instanceof QueryFailedError) {
        this.handleAccountConstraintError(error);
      }
      throw new BadRequestException("Failed to create account");
    }
  }

  /**
   * Updates an existing account by ID.
   *
   * - Re-hashes password if provided
   * - Prevents login duplication
   * - Returns updated DTO
   *
   * @param id - Account UUID
   * @param dto - Fields to update
   * @returns Updated account as `ReadAccountDto`
   *
   * @throws {NotFoundException} if account not found
   * @throws {ConflictException} if login already taken
   * @throws {BadRequestException} if persistence fails
   */
  async update(id: string, dto: UpdateAccountDto): Promise<ReadAccountDto> {
    this.logger.log(`update() | id=${id}`);

    try {
      const account = await this.repo.findOne({ where: { id } });
      if (!account) throw new NotFoundException("Account not found");

      if (dto.login && dto.login !== account.login) {
        account.login = dto.login;
      }
      if (dto.password) account.passwordHash = await argon2.hash(dto.password);
      if (dto.roleId) account.roleId = dto.roleId;

      const updated = await this.repo.save(account);
      this.logger.log(`update() | Account updated | id=${updated.id}`);
      return this.toDto(updated, ReadAccountDto);
    } catch (error: unknown) {
      this.logger.error(`update() | ${(error as Error).message}`, (error as Error).stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof QueryFailedError) {
        this.handleAccountConstraintError(error);
      }
      throw new BadRequestException("Failed to update account");
    }
  }

  /**
   * Soft-deletes an account by its ID.
   *
   * The record remains in the database with a non-null `deleted_at`
   * timestamp and can be restored if needed.
   *
   * @param id - Account UUID
   * @returns `{ success: true }` on successful deletion
   *
   * @throws {NotFoundException} if account not found
   * @throws {BadRequestException} if deletion fails
   */
  async softDelete(id: string): Promise<{ success: boolean }> {
    this.logger.log(`softDelete() | id=${id}`);

    try {
      const res = await this.repo.softDelete(id);
      if (!res.affected) throw new NotFoundException("Account not found");
      this.logger.log(`softDelete() | Account soft-deleted | id=${id}`);
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`softDelete() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to delete account");
    }
  }

  /**
   * Validates account credentials for authentication.
   *
   * @param login - Account login (username)
   * @param password - Plain password to verify
   * @returns Account entity if valid credentials
   *
   * @throws {NotFoundException} if credentials are invalid
   */
  async validateCredentials(login: string, password: string): Promise<Account> {
    const account = await this.repo.findOne({ where: { login } });
    if (!account) throw new NotFoundException("Invalid credentials");

    const valid = await argon2.verify(account.passwordHash, password);
    if (!valid) throw new NotFoundException("Invalid credentials");

    return account;
  }

  /**
   * Generates a short-lived access token.
   *
   * The access token contains:
   * - `sub` — user ID
   * - `username` — login
   * - `role` — user's role name
   * - `permissions` — list of assigned permissions
   * - `policies` — assigned policy constraints
   *
   * The token is signed with the access secret
   * and expires according to `JWT_ACCESS_TTL_SECONDS`.
   *
   * @param account - Account entity
   * @returns Promise<string> - Signed JWT access token
   */
  async generateAccessToken(account: Account): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: account.id,
      username: account.login,
      role: account.role.name,
      permissions: account.role.permissions,
      policies: account.role.policies,
    };

    return this.jwt.signAsync(payload, { expiresIn: this.accessTtl, secret: this.accessSecret });
  }

  /**
   * Generates a long-lived refresh token.
   *
   * The refresh token contains the minimal payload:
   * - `sub` — user ID
   * - `username` — login
   *
   * It is signed with a separate refresh secret
   * and has a longer expiration time.
   *
   * @param account - Account entity
   * @returns Promise<string> - Signed JWT refresh token
   */
  async generateRefreshToken(account: Account): Promise<string> {
    return this.jwt.signAsync(
      { sub: account.id, username: account.login },
      { expiresIn: this.refreshTtl, secret: this.refreshSecret },
    );
  }

  /**
   * Sets the refresh token in an HTTP-only cookie.
   *
   * @param res - Express response
   * @param token - Refresh token
   */
  setRefreshCookie(res: Response, token: string): void {
    const refreshMaxAge = this.refreshTtl * 1000;

    res.cookie("refresh_token", token, {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "strict",
      path: "/",
      maxAge: refreshMaxAge,
    });
  }

  /**
   * Maps low-level PostgreSQL database constraint violations
   * to domain-specific HTTP exceptions.
   *
   * This method inspects the `QueryFailedError` thrown by TypeORM
   * and checks the SQLSTATE error `code` and violated `constraint`
   * to determine the exact cause of the failure.
   *
   * ## How it works
   * - PostgreSQL uses SQLSTATE codes (e.g. `23505`, `23503`) to
   *   identify error categories such as unique violation or
   *   foreign key violation.
   * - TypeORM exposes these fields at runtime (via the pg driver),
   *   but not via TypeScript typings.
   * - This method interprets those codes and throws:
   *   - `409 Conflict` for unique constraint violations
   *   - `409 Conflict` for missing foreign key targets
   *   - `400 Bad Request` for all other cases
   *
   * @throws ConflictException | BadRequestException
   *
   * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
   */
  private handleAccountConstraintError(error: QueryFailedError): never {
    const pgError = error as QueryFailedError & PostgresQueryError;

    const { code, constraint } = pgError;

    if (code === PostgresErrorCode.UNIQUE_VIOLATION && constraint === "accounts__login__uk") {
      throw new ConflictException("Login already in use");
    }

    if (code === PostgresErrorCode.FOREIGN_KEY_VIOLATION && constraint === "accounts__role_id__fk") {
      throw new ConflictException("Role not found");
    }

    throw new BadRequestException("Failed to persist account");
  }
}
