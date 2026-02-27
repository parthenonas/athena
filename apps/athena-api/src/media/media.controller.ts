import { type AccessTokenPayload, Pageable, Permission } from "@athena/types";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response, Request } from "express";

import { JwtAuthGuard } from "../identity";
import { FilterFileDto } from "./dto/filter.dto";
import { ReadFileDto } from "./dto/read.dto";
import { SetQuotaDto } from "./dto/set-quota.dto";
import { UploadFileDto } from "./dto/upload.dto";
import { StorageUsageDto } from "./dto/usage.dto";
import { MediaQuota } from "./entities/media-quota.entity";
import { MediaService } from "./media.service";
import { AclGuard } from "../identity/acl/acl.guard";
import { RequirePermission } from "../identity/acl/decorators/require-permission.decorator";
import { CurrentUser } from "../shared/decorators/current-user.decorator";

/**
 * @Controller MediaController
 * @description
 * Handles HTTP requests for Media Assets (Files).
 *
 * Responsibilities:
 * - Listing files (Admin / Personal)
 * - Uploading files (Multipart/Form-Data)
 * - Streaming private files (Proxy)
 * - Metadata management
 *
 * Security:
 * - Public files are served directly from S3/MinIO (bypassing this controller).
 * - Private files are proxied via `GET /media/:id/download` with strict permission checks.
 */
@Controller("media")
@UseGuards(JwtAuthGuard, AclGuard)
export class MediaController {
  constructor(private readonly service: MediaService) {}

  /**
   * GET /media
   * Returns a paginated list of files.
   * Can be filtered by type, search query, or owner.
   */
  @Get()
  @RequirePermission(Permission.FILES_READ)
  async findAll(
    @Query() filters: FilterFileDto,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<Pageable<ReadFileDto>> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findAll(filters, userId, appliedPolicies);
  }

  /**
   * GET /media/usage
   * Returns storage usage stats for the current user.
   * Useful for displaying progress bars in the UI.
   */
  @Get("usage")
  @RequirePermission(Permission.FILES_READ)
  async getMyUsage(@CurrentUser() user: AccessTokenPayload): Promise<StorageUsageDto> {
    return this.service.getUsage(user.sub, user.role);
  }

  /**
   * GET /media/quotas
   * List all configured quotas.
   */
  @Get("quotas")
  @RequirePermission(Permission.ADMIN)
  async listQuotas(): Promise<MediaQuota[]> {
    return this.service.getQuotas();
  }

  /**
   * POST /media/quotas
   * Create or Update a quota for a role.
   */
  @Post("quotas")
  @RequirePermission(Permission.ADMIN)
  async setQuota(@Body() dto: SetQuotaDto): Promise<MediaQuota> {
    return this.service.setQuota(dto.roleName, dto.limitBytes);
  }

  /**
   * GET /media/:id
   * Returns file metadata (JSON).
   * Does NOT return file content.
   */
  @Get(":id")
  @RequirePermission(Permission.FILES_READ)
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<ReadFileDto> {
    const appliedPolicies = req.appliedPolicies || [];
    return this.service.findOne(id, userId, appliedPolicies);
  }

  /**
   * GET /media/:id/download
   * Streams the file content securely.
   * Used for files with 'private' access level.
   *
   * @returns StreamableFile - Direct stream from S3 to Client
   */
  @Get(":id/download")
  @RequirePermission(Permission.FILES_READ)
  async download(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<StreamableFile> {
    const appliedPolicies = req.appliedPolicies || [];
    const { stream, mimeType, fileName } = await this.service.getFileStream(id, userId, appliedPolicies);

    res.set({
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    });

    return new StreamableFile(stream);
  }

  /**
   * POST /media
   * Uploads a new file.
   * Expects `multipart/form-data` with field "file".
   * Additional metadata (like access level) passed in body.
   */
  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 1024 * 1024 * 1024,
      },
    }),
  )
  @RequirePermission(Permission.FILES_CREATE)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ReadFileDto> {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    return this.service.upload(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      user,
      dto.access,
    );
  }

  /**
   * DELETE /media/:id
   * Permanently deletes a file from Database and S3.
   * There is no soft-delete for media to save storage space.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.FILES_DELETE)
  async delete(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser("sub") userId: string,
    @Req() req: Request,
  ): Promise<void> {
    const appliedPolicies = req.appliedPolicies || [];
    await this.service.delete(id, userId, appliedPolicies);
  }

  /**
   * DELETE /media/quotas/:roleName
   * Reset quota for a specific role to default.
   */
  @Delete("quotas/:roleName")
  @RequirePermission(Permission.ADMIN)
  async deleteQuota(@Param("roleName") roleName: string): Promise<void> {
    return this.service.deleteQuota(roleName);
  }
}
