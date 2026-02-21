import { Permission } from "@athena/types";
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { CreateProfileDto } from "./dto/create.dto";
import { UpdateProfileDto } from "./dto/update.dto";
import { Profile } from "./entities/profile.entity";
import { ProfileService } from "./profile.service";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtAuthGuard } from "../account/guards/jwt.guard";
import { AclGuard } from "../acl/acl.guard";
import { RequirePermission } from "../acl/decorators/require-permission.decorator";

/**
 * @Controller ProfileController
 *
 * Handles CRUD operations for User Profiles within the Identity Context.
 * Supports both self-management ("me" routes) and administrative access (by ":ownerId").
 *
 * Architecture:
 * - "Me" routes automatically bind the operation to the current user's ID.
 * - ":ownerId" routes allow operations on specific targets (subject to ACL policies).
 * - Business logic and policy enforcement are delegated to ProfileService.
 */
@Controller("profiles")
@UseGuards(JwtAuthGuard, AclGuard)
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  /**
   * GET /profiles/me
   * Retrieves the profile of the currently authenticated user.
   *
   * Requires: profiles.read
   */
  @Get("me")
  @RequirePermission(Permission.PROFILES_READ)
  async getMe(@CurrentUser("sub") userId: string, @Req() req: Request): Promise<Profile> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findByOwnerId(userId, userId, appliedPolicies);
  }

  /**
   * POST /profiles/me
   * Creates a profile for the currently authenticated user.
   * Useful after registration if the profile wasn't created automatically.
   *
   * Requires: profiles.create
   */
  @Post("me")
  @RequirePermission(Permission.PROFILES_CREATE)
  async createMe(@CurrentUser("sub") userId: string, @Body() dto: CreateProfileDto): Promise<Profile> {
    return this.service.create(userId, dto);
  }

  /**
   * PATCH /profiles/me
   * Updates the profile of the currently authenticated user.
   *
   * Requires: profiles.update
   */
  @Patch("me")
  @RequirePermission(Permission.PROFILES_UPDATE)
  async updateMe(
    @CurrentUser("sub") userId: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ): Promise<Profile> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.update(userId, dto, userId, appliedPolicies);
  }

  /**
   * GET /profiles/:ownerId
   * Retrieves a specific profile by the Owner's Account ID.
   *
   * Requires: profiles.read
   * Policies: Service checks if the requester has access (e.g. OWN_ONLY).
   */
  @Get(":ownerId")
  @RequirePermission(Permission.PROFILES_READ)
  async getOne(
    @Param("ownerId", new ParseUUIDPipe()) ownerId: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<Profile> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findByOwnerId(ownerId, userId, appliedPolicies);
  }

  /**
   * POST /profiles/:ownerId
   * Creates a profile for a specific user.
   * Typically used by Admins to set up profiles for other users.
   *
   * Requires: profiles.create
   */
  @Post(":ownerId")
  @RequirePermission(Permission.PROFILES_CREATE)
  async create(
    @Param("ownerId", new ParseUUIDPipe()) ownerId: string,
    @Body() dto: CreateProfileDto,
  ): Promise<Profile> {
    return this.service.create(ownerId, dto);
  }

  /**
   * PATCH /profiles/:ownerId
   * Updates a specific profile by Owner ID.
   *
   * Requires: profiles.update
   * Policies: Service checks if the requester owns the resource or is Admin.
   */
  @Patch(":ownerId")
  @RequirePermission(Permission.PROFILES_UPDATE)
  async update(
    @Param("ownerId", new ParseUUIDPipe()) ownerId: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<Profile> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.update(ownerId, dto, userId, appliedPolicies);
  }
}
