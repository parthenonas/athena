import { Pageable, Permission, Policy } from "@athena/types";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { CreateLessonDto } from "./dto/create.dto";
import { FilterLessonDto } from "./dto/filter.dto";
import { ReadLessonDto } from "./dto/read.dto";
import { UpdateLessonDto } from "./dto/update.dto";
import { LessonService } from "./lesson.service";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";
import { RequirePermission } from "../../identity/acl/decorators/require-permission.decorator";
import { RequirePolicy } from "../../identity/acl/decorators/require-policy.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";

/**
 * @Controller LessonController
 * @description
 * Handles HTTP requests for Lessons.
 *
 * Security:
 * - Protected by JwtAuthGuard and AclGuard.
 * - Requires specific permissions (LESSONS_READ, LESSONS_CREATE, etc.).
 * - Delegated ACL: The Service layer checks permissions against the Parent Course.
 */
@Controller("lessons")
@UseGuards(JwtAuthGuard, AclGuard)
export class LessonController {
  constructor(private readonly service: LessonService) {}

  /**
   * GET /lessons
   * Returns a paginated list of lessons.
   * Usually filtered by ?courseId=...
   */
  @Get()
  @RequirePermission(Permission.LESSONS_READ)
  async findAll(
    @Query() filters: FilterLessonDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<Pageable<ReadLessonDto>> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findAll(filters, userId, appliedPolicies);
  }

  /**
   * GET /lessons/:id
   * Returns a single lesson.
   */
  @Get(":id")
  @RequirePermission(Permission.LESSONS_READ)
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadLessonDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findOne(id, userId, appliedPolicies);
  }

  /**
   * GET /lessons/:id/view
   * Returns the aggregated MongoDB Read Model (Lesson + all Blocks).
   * Intended for Studio (Authors/Admins). Contains sensitive block data.
   */
  @Get(":id/view")
  @RequirePermission(Permission.LESSONS_READ)
  async findOneView(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ) {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findOneView(id, userId, appliedPolicies);
  }

  /**
   * POST /lessons
   * Creates a new lesson.
   * Service verifies that the user owns the parent course.
   */
  @Post()
  @RequirePermission(Permission.LESSONS_CREATE)
  async create(@Body() dto: CreateLessonDto, @CurrentUser("sub") userId: string): Promise<ReadLessonDto> {
    return this.service.create(dto, userId);
  }

  /**
   * PATCH /lessons/:id
   * Updates a lesson.
   * Service verifies ownership of the parent course via ACL.
   */
  @Patch(":id")
  @RequirePermission(Permission.LESSONS_UPDATE)
  @RequirePolicy(Policy.OWN_ONLY)
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadLessonDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.update(id, dto, userId, appliedPolicies);
  }

  /**
   * DELETE /lessons/:id
   * Soft deletes a lesson.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.LESSONS_DELETE)
  @RequirePolicy(Policy.OWN_ONLY)
  async softDelete(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<void> {
    const appliedPolicies = req.appliedPolicies || [];
    await this.service.softDelete(id, userId, appliedPolicies);
  }

  /**
   * POST /lessons/sync
   * Rebuilds Mongo projections from Postgres. Admin only.
   */
  @Post("sync")
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.ADMIN)
  async syncReadModels() {
    return this.service.syncReadModels();
  }
}
