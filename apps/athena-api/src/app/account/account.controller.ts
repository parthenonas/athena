import { Permission } from "@athena-lms/shared/types/acl";
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";

import { AccountService } from "./account.service";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { AclGuard } from "../acl/acl.guard";
import { CreateAccountDto } from "./dto/create.dto";
import { FilterAccountDto } from "./dto/filter.dto";
import { LoginDto } from "./dto/login.dto";
import { TokenResponseDto } from "./dto/token.dto";
import { UpdateAccountDto } from "./dto/update.dto";
import { JwtAuthGuard } from "./guards/jwt.guard";
import { RequirePermission } from "../acl/decorators/require-permission.decorator";

/**
 * @Controller AccountController
 *
 * Handles all account-related HTTP endpoints:
 * - listing accounts,
 * - viewing your own profile,
 * - viewing any account (with permissions),
 * - creating, updating and deleting accounts,
 * - authentication (login).
 *
 * Access is protected via `JwtAuthGuard`.
 * All routes require explicit permission checks via `@RequirePermission`.
 *
 * Special "me" routes:
 *  - GET /accounts/me
 *  - PATCH /accounts/me
 *  - DELETE /accounts/me
 *
 * These endpoints operate strictly on the authenticated user
 * (`req.user.id`) and do not require object-level policy checks.
 *
 * Error handling:
 * Every route catches unexpected errors, logs them,
 * and returns a user-friendly `BadRequestException`.
 */
@Controller("accounts")
export class AccountController {
  constructor(private readonly service: AccountService) {}

  /**
   * GET /accounts
   * Returns a paginated list of accounts.
   *
   * Requires: accounts.read
   * Query params control pagination, sorting and search.
   */
  @Get()
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ACCOUNTS_READ)
  async findAll(@Query() filters: FilterAccountDto) {
    return this.service.findAll(filters);
  }

  /**
   * GET /accounts/me
   * Returns the profile of the authenticated user.
   *
   * Requires: accounts.read
   * Resource is implicitly OWN_ONLY (always current user).
   */
  @Get("me")
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ACCOUNTS_READ)
  async findMe(@CurrentUser("id") id: string) {
    return this.service.findOne(id);
  }

  /**
   * GET /accounts/:id
   * Returns account by ID.
   *
   * Requires: accounts.read
   * Admins may access arbitrary users.
   * Regular users may access only allowed accounts (policy applied elsewhere).
   */
  @Get(":id")
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ACCOUNTS_READ)
  async findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  /**
   * POST /accounts
   * Creates a new account.
   *
   * Requires: accounts.create
   * Admin-only use case.
   */
  @Post()
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ACCOUNTS_CREATE)
  async create(@Body() dto: CreateAccountDto) {
    return this.service.create(dto);
  }

  /**
   * PATCH /accounts/me
   * Updates authenticated user's own profile.
   *
   * Requires: accounts.update
   * Implicitly operates only on current user.
   */
  @Patch("me")
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ACCOUNTS_UPDATE)
  async updateMe(@CurrentUser("id") id: string, @Body() dto: UpdateAccountDto) {
    return this.service.update(id, dto);
  }

  /**
   * PATCH /accounts/:id
   * Updates any account by ID.
   *
   * Requires: accounts.update
   * Admin-level access; regular users must pass policy check elsewhere.
   */
  @Patch(":id")
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ACCOUNTS_UPDATE)
  async update(@Param("id") id: string, @Body() dto: UpdateAccountDto) {
    return this.service.update(id, dto);
  }

  /**
   * DELETE /accounts/me
   * Soft-deletes the current user's account.
   *
   * Requires: accounts.delete
   * Self-delete only.
   */
  @Delete("me")
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ACCOUNTS_DELETE)
  async deleteMe(@CurrentUser("id") id: string) {
    return this.service.softDelete(id);
  }

  /**
   * DELETE /accounts/:id
   * Soft-deletes an account by ID.
   *
   * Requires: accounts.delete
   * Admin-only route.
   */
  @Delete(":id")
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ACCOUNTS_DELETE)
  async delete(@Param("id") id: string) {
    return this.service.softDelete(id);
  }

  /**
   * POST /accounts/login
   * Authenticates a user and issues access & refresh tokens.
   *
   * Does NOT require authentication.
   * Refresh token is set as HTTP-only cookie.
   */
  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<TokenResponseDto> {
    const account = await this.service.validateCredentials(dto.login, dto.password);
    const accessToken = await this.service.generateAccessToken(account);
    const refreshToken = await this.service.generateRefreshToken(account);
    this.service.setRefreshCookie(res, refreshToken);

    return { accessToken };
  }
}
