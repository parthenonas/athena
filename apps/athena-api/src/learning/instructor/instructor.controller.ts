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

import { CreateInstructorDto } from "./dto/create.dto";
import { FilterInstructorDto } from "./dto/filter.dto";
import { ReadInstructorViewDto } from "./dto/read-view.dto";
import { ReadInstructorDto } from "./dto/read.dto";
import { UpdateInstructorDto } from "./dto/update.dto";
import { InstructorService } from "./instructor.service";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";
import { RequirePermission } from "../../identity/acl/decorators/require-permission.decorator";
import { RequirePolicy } from "../../identity/acl/decorators/require-policy.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";

/**
 * @Controller InstructorController
 *
 * Handles CRUD operations for Instructor Profiles.
 * Maps HTTP requests to the InstructorService.
 * Enforces security policies (e.g. users can only update their own profile).
 */
@Controller("instructors")
@UseGuards(JwtAuthGuard, AclGuard)
export class InstructorController {
  constructor(private readonly service: InstructorService) {}

  /**
   * GET /instructors
   * Returns a paginated list of instructors.
   *
   * Requires: instructors.read
   */
  @Get()
  @RequirePermission(Permission.INSTRUCTORS_READ)
  async findAll(
    @Query() filters: FilterInstructorDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<Pageable<ReadInstructorDto>> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findAll(filters, userId, appliedPolicies);
  }

  /**
   * GET /instructors
   * Public catalog of instructors.
   * Reads from MongoDB Projection.
   */
  @Get("/public")
  async findAllView(@Query() filters: FilterInstructorDto): Promise<Pageable<ReadInstructorViewDto>> {
    return this.service.findAllView(filters);
  }

  /**
   * GET /instructors/public/:id
   * Public single instructor view.
   * Reads from MongoDB Projection.
   */
  @Get("/public/:id")
  async findOneView(@Param("id", new ParseUUIDPipe()) id: string): Promise<ReadInstructorViewDto> {
    return this.service.findOneView(id);
  }

  /**
   * GET /instructors/:id
   * Returns a single instructor profile.
   *
   * Requires: instructors.read
   */
  @Get(":id")
  @RequirePermission(Permission.INSTRUCTORS_READ)
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadInstructorDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findOne(id, userId, appliedPolicies);
  }

  /**
   * POST /instructors
   * Creates a new instructor profile.
   *
   * Requires: instructors.create
   */
  @Post()
  @RequirePermission(Permission.INSTRUCTORS_CREATE)
  async create(@Body() dto: CreateInstructorDto): Promise<ReadInstructorDto> {
    return this.service.create(dto);
  }

  /**
   * PATCH /instructors/:id
   * Updates an instructor profile.
   *
   * Requires: instructors.update
   * Policies: OWN_ONLY ensures users can't edit other instructors' bios.
   */
  @Patch(":id")
  @RequirePermission(Permission.INSTRUCTORS_UPDATE)
  @RequirePolicy(Policy.OWN_ONLY)
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateInstructorDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadInstructorDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.update(id, dto, userId, appliedPolicies);
  }

  /**
   * DELETE /instructors/:id
   * Deletes an instructor profile.
   *
   * Requires: instructors.delete
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.INSTRUCTORS_DELETE)
  @RequirePolicy(Policy.OWN_ONLY)
  async delete(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<void> {
    const appliedPolicies = req.appliedPolicies || [];
    await this.service.delete(id, userId, appliedPolicies);
  }
}
