import { Pageable, Permission, Policy } from "@athena/types";
import {
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
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { CreateEnrollmentDto } from "./dto/create.dto";
import { FilterEnrollmentDto } from "./dto/filter.dto";
import { ReadEnrollmentDto } from "./dto/read.dto";
import { UpdateEnrollmentDto } from "./dto/update.dto";
import { EnrollmentService } from "./enrollment.service";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";
import { RequirePermission } from "../../identity/acl/decorators/require-permission.decorator";
import { RequirePolicy } from "../../identity/acl/decorators/require-policy.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";

/**
 * @Controller EnrollmentController
 *
 * Handles CRUD operations for student enrollments.
 * Enforces authentication via JWT and authorization via ACL (Permissions & Policies).
 */
@Controller("enrollments")
@UseGuards(JwtAuthGuard, AclGuard)
export class EnrollmentController {
  constructor(private readonly service: EnrollmentService) {}

  /**
   * GET /enrollments
   * Returns a list of enrollments.
   *
   * Requires: enrollments.read
   * Policies: Filters applied by service (e.g. students only see their own).
   */
  @Get()
  @RequirePermission(Permission.ENROLLMENTS_READ)
  async findAll(
    @Query() filters: FilterEnrollmentDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<Pageable<ReadEnrollmentDto>> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findAll(filters, userId, appliedPolicies);
  }

  /**
   * GET /enrollments/:id
   * Returns a single enrollment.
   *
   * Requires: enrollments.read
   */
  @Get(":id")
  @RequirePermission(Permission.ENROLLMENTS_READ)
  async findOne(
    @Param("id") id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadEnrollmentDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findOne(id, userId, appliedPolicies);
  }

  /**
   * POST /enrollments
   * Enrolls a student into a cohort.
   *
   * Requires: enrollments.create
   */
  @Post()
  @RequirePermission(Permission.ENROLLMENTS_CREATE)
  async create(@Body() dto: CreateEnrollmentDto): Promise<ReadEnrollmentDto> {
    return this.service.create(dto);
  }

  /**
   * PATCH /enrollments/:id
   * Updates enrollment status (e.g., expel/complete).
   *
   * Requires: enrollments.update
   * Policies: Typically restricted to admins or instructors (via OWN_ONLY on Cohort).
   */
  @Patch(":id")
  @RequirePermission(Permission.ENROLLMENTS_UPDATE)
  @RequirePolicy(Policy.OWN_ONLY)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateEnrollmentDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadEnrollmentDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.update(id, dto, userId, appliedPolicies);
  }

  /**
   * DELETE /enrollments/:id
   * Removes an enrollment record.
   *
   * Requires: enrollments.delete
   * Policies: Must check ownership if restricted.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.ENROLLMENTS_DELETE)
  @RequirePolicy(Policy.OWN_ONLY)
  async delete(@Param("id") id: string, @CurrentUser("sub") userId: string, @Req() req: Request): Promise<void> {
    const appliedPolicies = req.appliedPolicies || [];
    await this.service.delete(id, userId, appliedPolicies);
  }
}
