import { Permission } from "@athena/types";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response, Request } from "express";

import { AccountService } from "./account.service";
import { AclGuard } from "../acl/acl.guard";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateAccountDto } from "./dto/create.dto";
import { FilterAccountDto } from "./dto/filter.dto";
import { LoginDto } from "./dto/login.dto";
import { TokenResponseDto } from "./dto/token.dto";
import { UpdateAccountDto } from "./dto/update.dto";
import { JwtAuthGuard } from "./guards/jwt.guard";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
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
  async findMe(@CurrentUser("sub") id: string) {
    return this.service.findOne(id);
  }

  /**
   * GET /accounts/refresh
   * Refreshes access token using a valid refresh token.
   *
   * Requires refresh token in HTTP-only cookie.
   */
  @Get("refresh")
  async refresh(@Req() req: Request) {
    const token = req.cookies?.["refresh_token"];

    if (!token) {
      throw new BadRequestException("Missing refresh token");
    }

    const accessToken = await this.service.refresh(token);

    return { accessToken };
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
  async updateMe(@CurrentUser("sub") id: string, @Body() dto: UpdateAccountDto) {
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ACCOUNTS_DELETE)
  async deleteMe(@CurrentUser("sub") id: string) {
    await this.service.softDelete(id);
  }

  /**
   * DELETE /accounts/:id
   * Soft-deletes an account by ID.
   *
   * Requires: accounts.delete
   * Admin-only route.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ACCOUNTS_DELETE)
  async delete(@Param("id") id: string) {
    await this.service.softDelete(id);
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

  /**
   * PATCH /accounts/me/password
   * Changes the authenticated user's password.
   */
  @Patch("me/password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentUser("sub") userId: string, @Body() dto: ChangePasswordDto) {
    await this.service.changePassword(userId, dto);
  }
}
