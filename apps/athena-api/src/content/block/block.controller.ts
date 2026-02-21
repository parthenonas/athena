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

import { BlockLibraryService } from "./block.library.service";
import { BlockService } from "./block.service";
import { CreateBlockDto } from "./dto/create.dto";
import { CreateLibraryBlockDto } from "./dto/create.library.dto";
import { BlockDryRunDto } from "./dto/dry-run.dto";
import { FilterLibraryBlockDto } from "./dto/filter.library.dto";
import { ReadBlockDto } from "./dto/read.dto";
import { ReadLibraryBlockDto } from "./dto/read.library.dto";
import { ReorderBlockDto, UpdateBlockDto } from "./dto/update.dto";
import { UpdateLibraryBlockDto } from "./dto/update.library.dto";
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
  constructor(
    private readonly service: BlockService,
    private readonly libraryService: BlockLibraryService,
  ) {}

  /**
   * POST /blocks/library
   * Saves a block into the user's template library.
   */
  @Post("library")
  @RequirePermission(Permission.LESSONS_CREATE)
  async createLibraryBlock(
    @Body() dto: CreateLibraryBlockDto,
    @CurrentUser("sub") userId: string,
  ): Promise<ReadLibraryBlockDto> {
    return this.libraryService.createLibraryBlock(dto, userId);
  }

  /**
   * GET /blocks/library
   * Searches the block library (with tags and pagination).
   */
  @Get("library")
  @RequirePermission(Permission.LESSONS_READ)
  async findLibraryBlocks(
    @Query() dto: FilterLibraryBlockDto,
    @CurrentUser("sub") userId: string,
  ): Promise<Pageable<ReadLibraryBlockDto>> {
    return this.libraryService.findLibraryBlocks(dto, userId);
  }

  /**
   * GET /blocks/library/:id
   * Gets a specific library block template.
   */
  @Get("library/:id")
  @RequirePermission(Permission.LESSONS_READ)
  @RequirePolicy(Policy.OWN_ONLY)
  async findOneLibraryBlock(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadLibraryBlockDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.libraryService.findOneLibraryBlock(id, userId, appliedPolicies);
  }

  /**
   * PATCH /blocks/library/:id
   * Updates a library block template.
   */
  @Patch("library/:id")
  @RequirePermission(Permission.LESSONS_UPDATE)
  @RequirePolicy(Policy.OWN_ONLY)
  async updateLibraryBlock(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLibraryBlockDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadLibraryBlockDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.libraryService.updateLibraryBlock(id, dto, userId, appliedPolicies);
  }

  /**
   * DELETE /blocks/library/:id
   * Removes a block from the template library.
   */
  @Delete("library/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.LESSONS_UPDATE)
  @RequirePolicy(Policy.OWN_ONLY)
  async removeLibraryBlock(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<void> {
    const appliedPolicies = req.appliedPolicies || [];
    await this.libraryService.removeLibraryBlock(id, userId, appliedPolicies);
  }

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
    @Param("lessonId", new ParseUUIDPipe()) lessonId: string,
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
    @Param("id", new ParseUUIDPipe()) id: string,
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
    @Param("id", new ParseUUIDPipe()) id: string,
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
    @Param("id", new ParseUUIDPipe()) id: string,
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
  async remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<void> {
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
