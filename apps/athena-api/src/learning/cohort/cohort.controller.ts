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

import { CohortService } from "./cohort.service";
import { CreateCohortDto } from "./dto/create.dto";
import { FilterCohortDto } from "./dto/filter.dto";
import { ReadCohortDto } from "./dto/read.dto";
import { UpdateCohortDto } from "./dto/update.dto";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";
import { RequirePermission } from "../../identity/acl/decorators/require-permission.decorator";
import { RequirePolicy } from "../../identity/acl/decorators/require-policy.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";

/**
 * @Controller CohortController
 *
 * Handles all CRUD operations for the Cohort entity within the Learning Bounded Context.
 * The Controller's primary role is delegation and authentication enforcement.
 * Policy filtering is delegated to the service layer.
 */
@Controller("cohorts")
@UseGuards(JwtAuthGuard, AclGuard)
export class CohortController {
  constructor(private readonly service: CohortService) {}

  /**
   * GET /cohorts
   * Returns a paginated list of cohorts.
   *
   * Requires: cohorts.read
   * Policies: The service must apply filters (e.g., OWN_ONLY)
   * based on the policies attached to the request by AclGuard.
   */
  @Get()
  @RequirePermission(Permission.COHORTS_READ)
  async findAll(
    @Query() filters: FilterCohortDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<Pageable<ReadCohortDto>> {
    const appliedPolicies = req.appliedPolicies || [];

    return this.service.findAll(filters, userId, appliedPolicies);
  }

  /**
   * GET /cohorts/:id
   * Retrieves a single cohort by ID.
   *
   * Requires: cohorts.read
   * Policies: OWN_ONLY policy check is implicitly required in the service if resource
   * ownership matters for viewing.
   */
  @Get(":id")
  @RequirePermission(Permission.COHORTS_READ)
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadCohortDto> {
    const appliedPolicies = req.appliedPolicies || [];

    return this.service.findOne(id, userId, appliedPolicies);
  }

  /**
   * POST /cohorts
   * Creates a new cohort.
   *
   * Requires: cohorts.create
   */
  @Post()
  @RequirePermission(Permission.COHORTS_CREATE)
  async create(@Body() dto: CreateCohortDto): Promise<ReadCohortDto> {
    return this.service.create(dto);
  }

  /**
   * PATCH /cohorts/:id
   * Updates an existing cohort by ID.
   *
   * Requires: cohorts.update
   * Policies: The role must have a policy that permits updating the resource
   * (e.g., OWN_ONLY). This check happens in the service layer.
   */
  @Patch(":id")
  @RequirePermission(Permission.COHORTS_UPDATE)
  @RequirePolicy(Policy.OWN_ONLY)
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCohortDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadCohortDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.update(id, dto, userId, appliedPolicies);
  }

  /**
   * DELETE /cohorts/:id
   * Deletes a cohort by ID.
   *
   * Requires: cohorts.delete
   * Policies: OWN_ONLY must be checked.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.COHORTS_DELETE)
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
