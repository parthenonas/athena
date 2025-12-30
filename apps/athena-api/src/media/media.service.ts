import type { Readable } from "stream";

import { AccessTokenPayload, FileAccess, Pageable, Policy } from "@athena/types";
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
  InternalServerErrorException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuid } from "uuid";

import { IdentityService } from "../identity";
import { FilterFileDto } from "./dto/filter.dto";
import { ReadFileDto } from "./dto/read.dto";
import { StoredFile } from "./entities/stored-file.entity";
import { BaseService } from "../base/base.service";
import { MediaQuota } from "./entities/media-quota.entity";
import { AthenaEvent } from "../shared/events/types";

/**
 * @class MediaService
 * @description
 * Handles file management operations:
 * - Uploading to S3-compatible storage (MinIO)
 * - Metadata persistence in PostgreSQL
 * - Quota management per user
 * - Streaming downloads for private files
 *
 * It acts as a facade over the raw S3 SDK and the Database.
 */
@Injectable()
export class MediaService extends BaseService<StoredFile> implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpointPublic: string;
  private readonly defaultQuota: number;

  constructor(
    @InjectRepository(StoredFile)
    private readonly repo: Repository<StoredFile>,
    @InjectRepository(MediaQuota)
    private readonly quotaRepo: Repository<MediaQuota>,
    private readonly config: ConfigService,
    private readonly identity: IdentityService,
  ) {
    super();
    this.bucket = this.config.get<string>("STORAGE_BUCKET_NAME", "athena-public");
    this.endpointPublic = this.config.get<string>("STORAGE_ENDPOINT_PUBLIC", "http://localhost:9000");
    this.defaultQuota = parseInt(this.config.get("STORAGE_QUOTA_DEFAULT", "104857600"), 10);

    this.s3 = new S3Client({
      endpoint: this.config.get<string>("STORAGE_ENDPOINT"),
      region: this.config.get<string>("STORAGE_REGION", "us-east-1"),
      credentials: {
        accessKeyId: this.config.get<string>("STORAGE_ACCESS_KEY", ""),
        secretAccessKey: this.config.get<string>("STORAGE_SECRET_KEY", ""),
      },
      forcePathStyle: true,
    });
  }

  /**
   * Lifecycle hook to ensure storage bucket exists on startup.
   */
  async onModuleInit() {
    await this.ensureBucketExists();
  }

  /**
   * Retrieves paginated files (e.g., for "My Files" or Admin).
   */
  async findAll(
    filters: FilterFileDto,
    userId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<Pageable<ReadFileDto>> {
    const { page, limit, sortBy, sortOrder, search, ownerId, type } = filters;
    this.logger.log(`findAll() | ownerId=${ownerId}, page=${page}`);

    try {
      const qb = this.repo.createQueryBuilder("f");

      this.identity.applyPoliciesToQuery(qb, userId, appliedPolicies, "f");

      if (ownerId) {
        qb.andWhere("f.ownerId = :ownerId", { ownerId });
      }

      if (type) {
        qb.andWhere("f.mimeType ILIKE :type", { type: `${type}%` });
      }

      if (search?.trim()) {
        qb.andWhere("f.originalName ILIKE :search", { search: `%${search.trim()}%` });
      }

      qb.orderBy(`f.${sortBy}`, sortOrder.toUpperCase() as "ASC" | "DESC");
      qb.skip((page - 1) * limit).take(limit);

      const [entities, total] = await qb.getManyAndCount();
      const data = entities.map(entity => {
        const dto = this.toDto(entity, ReadFileDto);
        dto.url = this.generatePublicUrl(entity);
        return dto;
      });

      return {
        data,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    } catch (error: unknown) {
      this.logger.error(`findAll() | ${(error as Error).message}`, (error as Error).stack);
      throw new BadRequestException("Failed to fetch files");
    }
  }

  /**
   * Uploads a file to S3 and saves metadata.
   *
   * @param file - File buffer or stream with metadata
   * @param ownerId - UUID of the uploader
   * @param access - Public or Private visibility
   */
  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    user: AccessTokenPayload,
    access: FileAccess = FileAccess.Private,
  ): Promise<ReadFileDto> {
    this.logger.log(`upload() | user=${user.sub}, name="${file.originalname}", size=${file.size}`);

    await this.checkQuota(user.sub, user.role, file.size);

    const fileKey = `${user.sub}/${uuid()}`;

    try {
      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: this.bucket,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });
      await upload.done();
    } catch (error) {
      this.logger.error(`upload() | S3 Upload Failed`, error);
      throw new InternalServerErrorException("Failed to upload file to storage");
    }

    try {
      const entity = this.repo.create({
        bucket: this.bucket,
        key: fileKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size.toString(),
        ownerId: user.sub,
        access,
      });

      const saved = await this.repo.save(entity);
      const dto = this.toDto(saved, ReadFileDto);
      dto.url = this.generatePublicUrl(saved);

      return dto;
    } catch (error: unknown) {
      this.logger.error(`upload() | DB Save Failed. Cleaning up S3... | key=${fileKey}`, (error as Error).stack);

      try {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: fileKey }));
        this.logger.log(`upload() | Cleanup successful | key=${fileKey}`);
      } catch (cleanupError) {
        this.logger.error(`upload() | CRITICAL: Failed to cleanup S3 after DB error | key=${fileKey}`, cleanupError);
      }

      if (error instanceof PayloadTooLargeException) throw error;
      throw new BadRequestException("Failed to save file metadata");
    }
  }

  /**
   * Retrieves a file entity by ID.
   */
  async findOne(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<ReadFileDto> {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException("File not found");

    this.checkAccess(file, userId, appliedPolicies);

    const dto = this.toDto(file, ReadFileDto);
    dto.url = this.generatePublicUrl(file);
    return dto;
  }

  /**
   * Returns a Readable Stream of the file content (for private downloads).
   */
  async getFileStream(
    id: string,
    userId: string,
    appliedPolicies: Policy[] = [],
  ): Promise<{ stream: Readable; mimeType: string; fileName: string }> {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException("File not found");

    this.checkAccess(file, userId, appliedPolicies);

    try {
      const command = new GetObjectCommand({
        Bucket: file.bucket,
        Key: file.key,
      });

      const item = await this.s3.send(command);
      return {
        stream: item.Body as Readable,
        mimeType: file.mimeType,
        fileName: file.originalName,
      };
    } catch (error) {
      this.logger.error(`getFileStream() | S3 Error for id=${id}`, error);
      throw new BadRequestException("Could not retrieve file content");
    }
  }

  /**
   * Deletes a file from DB and S3.
   */
  async delete(id: string, userId: string, appliedPolicies: Policy[] = []): Promise<void> {
    this.logger.log(`delete() | id=${id}`);

    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException("File not found");

    for (const policy of appliedPolicies) {
      if (!this.identity.checkAbility(policy, userId, file)) {
        throw new ForbiddenException("You are not allowed to delete this file");
      }
    }

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: file.bucket,
          Key: file.key,
        }),
      );
    } catch {
      this.logger.warn(`delete() | Failed to delete from S3 (orphan possible) | key=${file.key}`);
    }

    await this.repo.delete(id);
  }

  /**
   * Generates a URL for the client.
   * - Public: Direct link to MinIO.
   * - Private: Link to Backend Proxy endpoint.
   */
  private generatePublicUrl(file: StoredFile): string {
    if (file.access === FileAccess.Public) {
      return `${this.endpointPublic}/${this.bucket}/${file.key}`;
    }
    return `/api/media/${file.id}/download`;
  }

  /**
   * Verifies if the user has enough space left.
   */
  private async checkQuota(ownerId: string, roleName: string, newFileSize: number): Promise<void> {
    const quotaSetting = await this.quotaRepo.findOne({ where: { roleName } });

    const limitBytes = quotaSetting ? parseInt(quotaSetting.limitBytes, 10) : this.defaultQuota;

    const result = await this.repo
      .createQueryBuilder("f")
      .select("SUM(f.size)", "total")
      .where("f.owner_id = :ownerId", { ownerId })
      .getRawOne();

    const currentUsage = parseInt(result?.total || "0", 10);
    const available = limitBytes - currentUsage;

    if (newFileSize > available) {
      const limitMb = Math.round(limitBytes / 1024 / 1024);
      const usedMb = Math.round(currentUsage / 1024 / 1024);
      throw new PayloadTooLargeException(`Storage quota exceeded. Limit: ${limitMb}MB, Used: ${usedMb}MB`);
    }
  }

  /**
   * Initializes the bucket and policy on startup.
   */
  private async ensureBucketExists() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error: any) { // eslint-disable-line
      if (error.$metadata?.httpStatusCode === 404) {
        this.logger.log(`Bucket "${this.bucket}" not found. Creating...`);
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));

        const policy = {
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "PublicRead",
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        };
        await this.s3.send(
          new PutBucketPolicyCommand({
            Bucket: this.bucket,
            Policy: JSON.stringify(policy),
          }),
        );
      }
    }
  }

  /**
   * Helper for checking read access
   */
  private checkAccess(file: StoredFile, userId: string, policies: Policy[]) {
    if (file.access === FileAccess.Public) return;

    for (const policy of policies) {
      if (!this.identity.checkAbility(policy, userId, file)) {
        throw new ForbiddenException("You are not allowed to access this file");
      }
    }
  }

  /**
   * ADMIN ONLY: Returns all configured quotas.
   */
  async getQuotas(): Promise<MediaQuota[]> {
    return this.quotaRepo.find({ order: { roleName: "ASC" } });
  }

  /**
   * ADMIN ONLY: Sets or updates storage quota for a specific role.
   */
  async setQuota(roleName: string, limitBytes: number): Promise<MediaQuota> {
    this.logger.log(`setQuota() | role=${roleName}, limit=${limitBytes}`);

    const entity = this.quotaRepo.create({
      roleName,
      limitBytes: limitBytes.toString(),
    });

    return this.quotaRepo.save(entity);
  }

  /**
   * EVENT LISTENER: Cleans up quota when a role is deleted.
   * Decoupled communication between Identity and Media modules.
   */
  @OnEvent(AthenaEvent.ROLE_DELETED)
  async handleRoleDeletedEvent(payload: { name: string }) {
    this.logger.log(`Event "role.deleted" received for role="${payload.name}". Cleaning up quotas...`);

    const result = await this.quotaRepo.delete({ roleName: payload.name });

    if (result.affected) {
      this.logger.log(`Quota for role="${payload.name}" deleted.`);
    }
  }
}
