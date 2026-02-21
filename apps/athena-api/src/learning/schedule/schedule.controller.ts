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

import { CreateScheduleDto } from "./dto/create.dto";
import { FilterScheduleDto } from "./dto/filter.dto";
import { ReadScheduleDto } from "./dto/read.dto";
import { UpdateScheduleDto } from "./dto/update.dto";
import { ScheduleService } from "./schedule.service";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";
import { RequirePermission } from "../../identity/acl/decorators/require-permission.decorator";
import { RequirePolicy } from "../../identity/acl/decorators/require-policy.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";

/**
 * @Controller ScheduleController
 *
 * Handles CRUD operations for the Lesson Schedule.
 * Delegates business logic and security checks (ownership) to ScheduleService.
 */
@Controller("schedules")
@UseGuards(JwtAuthGuard, AclGuard)
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  /**
   * GET /schedules
   * Returns a paginated list of schedule entries.
   *
   * Requires: schedule.read
   */
  @Get()
  @RequirePermission(Permission.SCHEDULE_READ)
  async findAll(
    @Query() filters: FilterScheduleDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<Pageable<ReadScheduleDto>> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findAll(filters, userId, appliedPolicies);
  }

  /**
   * GET /schedules/:id
   * Returns a single schedule entry.
   *
   * Requires: schedule.read
   */
  @Get(":id")
  @RequirePermission(Permission.SCHEDULE_READ)
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadScheduleDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findOne(id, userId, appliedPolicies);
  }

  /**
   * POST /schedules
   * Creates a new schedule entry (assigns a lesson to a cohort).
   *
   * Requires: schedule.create
   */
  @Post()
  @RequirePermission(Permission.SCHEDULE_CREATE)
  async create(@Body() dto: CreateScheduleDto): Promise<ReadScheduleDto> {
    return this.service.create(dto);
  }

  /**
   * PATCH /schedules/:id
   * Updates schedule details (dates, manual override).
   *
   * Requires: schedule.update
   * Policies: OWN_ONLY ensures that only the instructor of the cohort can modify the schedule.
   */
  @Patch(":id")
  @RequirePermission(Permission.SCHEDULE_UPDATE)
  @RequirePolicy(Policy.OWN_ONLY)
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadScheduleDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.update(id, dto, userId, appliedPolicies);
  }

  /**
   * DELETE /schedules/:id
   * Deletes a schedule entry.
   *
   * Requires: schedule.delete
   * Policies: OWN_ONLY check required.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.SCHEDULE_DELETE)
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
