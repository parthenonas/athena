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

import { CourseService } from "./course.service";
import { CreateCourseDto } from "./dto/create.dto";
import { FilterCourseDto } from "./dto/filter.dto";
import { ReadCourseDto } from "./dto/read.dto";
import { UpdateCourseDto } from "./dto/update.dto";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";
import { RequirePermission } from "../../identity/acl/decorators/require-permission.decorator";
import { RequirePolicy } from "../../identity/acl/decorators/require-policy.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";

/**
 * @Controller CourseController
 *
 * Handles all CRUD operations for the Course entity within the Content Bounded Context.
 * The Controller's primary role is delegation and authentication enforcement.
 * Policy filtering is delegated to the service layer.
 */
@Controller("courses")
@UseGuards(JwtAuthGuard, AclGuard)
export class CourseController {
  constructor(private readonly service: CourseService) {}

  /**
   * GET /courses
   * Returns a paginated list of courses.
   *
   * Requires: courses.read
   * Policies: The service must apply filters (e.g., OWN_ONLY or NOT_PUBLISHED)
   * based on the policies attached to the request by AclGuard.
   */
  @Get()
  @RequirePermission(Permission.COURSES_READ)
  async findAll(
    @Query() filters: FilterCourseDto,
    @CurrentUser("sub") ownerId: string,
    @Req() req: Request,
  ): Promise<Pageable<ReadCourseDto>> {
    const appliedPolicies = req.appliedPolicies || [];

    return this.service.findAll(filters, ownerId, appliedPolicies);
  }

  /**
   * GET /courses/:id
   * Retrieves a single course by ID.
   *
   * Requires: courses.read
   * Policies: OWN_ONLY policy check is implicitly required in the service if resource
   * ownership matters for viewing.
   */
  @Get(":id")
  @RequirePermission(Permission.COURSES_READ)
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") ownerId: string,
    @Req() req: Request,
  ): Promise<ReadCourseDto> {
    const appliedPolicies = req.appliedPolicies || [];

    return this.service.findOne(id, ownerId, appliedPolicies);
  }

  /**
   * POST /courses
   * Creates a new course.
   *
   * Requires: courses.create
   */
  @Post()
  @RequirePermission(Permission.COURSES_CREATE)
  async create(@CurrentUser("sub") ownerId: string, @Body() dto: CreateCourseDto): Promise<ReadCourseDto> {
    return this.service.create(dto, ownerId);
  }

  /**
   * PATCH /courses/:id
   * Updates an existing course by ID.
   *
   * Requires: courses.update
   * Policies: The role must have a policy that permits updating the resource
   * (e.g., OWN_ONLY). This check happens in the service layer.
   */
  @Patch(":id")
  @RequirePermission(Permission.COURSES_UPDATE)
  @RequirePolicy(Policy.OWN_ONLY)
  async update(
    @CurrentUser("sub") userId: string,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCourseDto,
    @Req() req: Request,
  ): Promise<ReadCourseDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.update(id, dto, userId, appliedPolicies);
  }

  /**
   * DELETE /courses/:id
   * Soft-deletes a course by ID.
   *
   * Requires: courses.delete
   * Policies: OWN_ONLY must be checked.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.COURSES_DELETE)
  @RequirePolicy(Policy.OWN_ONLY)
  async softDelete(
    @CurrentUser("sub") userId: string,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<void> {
    const appliedPolicies = req.appliedPolicies || [];
    await this.service.softDelete(id, userId, appliedPolicies);
  }
}
