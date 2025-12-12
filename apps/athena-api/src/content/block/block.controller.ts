import { Permission, Policy } from "@athena/types";
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
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { BlockService } from "./block.service";
import { CreateBlockDto } from "./dto/create.dto";
import { BlockDryRunDto } from "./dto/dry-run.dto";
import { ReadBlockDto } from "./dto/read.dto";
import { ReorderBlockDto, UpdateBlockDto } from "./dto/update.dto";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";
import { RequirePermission } from "../../identity/acl/decorators/require-permission.decorator";
import { RequirePolicy } from "../../identity/acl/decorators/require-policy.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";

/**
 * @Controller BlockController
 * @description
 * Handles HTTP requests for Content Blocks (Text, Video, Code, etc.).
 *
 * Security:
 * - Protected by JwtAuthGuard and AclGuard.
 * - Blocks are considered intrinsic parts of a Lesson, so we use LESSONS_* permissions.
 * - ACL: Service layer verifies permissions against the Parent Course (via Lesson).
 */
@Controller("blocks")
@UseGuards(JwtAuthGuard, AclGuard)
export class BlockController {
  constructor(private readonly service: BlockService) {}

  /**
   * POST /blocks
   * Creates a new content block in a lesson.
   * Requires LESSONS_UPDATE permission (since adding a block modifies the lesson).
   */
  @Post()
  @RequirePermission(Permission.LESSONS_UPDATE)
  async create(@Body() dto: CreateBlockDto, @CurrentUser("sub") userId: string): Promise<ReadBlockDto> {
    return this.service.create(dto, userId);
  }

  /**
   * GET /blocks/lesson/:lessonId
   * Returns all blocks for a specific lesson, sorted by orderIndex.
   */
  @Get("lesson/:lessonId")
  @RequirePermission(Permission.LESSONS_READ)
  async findAllByLesson(
    @Param("lessonId") lessonId: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadBlockDto[]> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findAllByLesson(lessonId, userId, appliedPolicies);
  }

  /**
   * GET /blocks/:id
   * Returns a single block by ID.
   */
  @Get(":id")
  @RequirePermission(Permission.LESSONS_READ)
  async findOne(
    @Param("id") id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadBlockDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findOne(id, userId, appliedPolicies);
  }

  /**
   * PATCH /blocks/:id
   * Updates block content or type.
   */
  @Patch(":id")
  @RequirePermission(Permission.LESSONS_UPDATE)
  @RequirePolicy(Policy.OWN_ONLY)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateBlockDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadBlockDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.update(id, dto, userId, appliedPolicies);
  }

  /**
   * PATCH /blocks/:id/reorder
   * Specific endpoint for Drag-and-Drop operations.
   * Updates only the orderIndex.
   */
  @Patch(":id/reorder")
  @RequirePermission(Permission.LESSONS_UPDATE)
  @RequirePolicy(Policy.OWN_ONLY)
  async reorder(
    @Param("id") id: string,
    @Body() dto: ReorderBlockDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadBlockDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.reorder(id, dto, userId, appliedPolicies);
  }

  /**
   * DELETE /blocks/:id
   * Permanently removes a block.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.LESSONS_UPDATE)
  @RequirePolicy(Policy.OWN_ONLY)
  async remove(@Param("id") id: string, @CurrentUser("sub") userId: string, @Req() req: Request): Promise<void> {
    const appliedPolicies = req.appliedPolicies || [];
    await this.service.remove(id, userId, appliedPolicies);
  }

  /**
   * POST /blocks/dry-run
   * Executes code on the Runner without saving state.
   * Returns a submission ID (queued status). The actual result comes via WebSocket.
   *
   * Requires LESSONS_UPDATE because essentially you are working on lesson content.
   */
  @Post("dry-run")
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission(Permission.BLOCKS_EXECUTE)
  @RequirePolicy(Policy.OWN_ONLY)
  async dryRun(@Body() dto: BlockDryRunDto, @CurrentUser("sub") userId: string, @Req() req: Request): Promise<void> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.dryRun(dto, userId, appliedPolicies);
  }
}
