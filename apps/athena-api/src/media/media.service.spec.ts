const mockS3Send = jest.fn();
const mockUploadDone = jest.fn();

jest.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockS3Send,
    })),
    CreateBucketCommand: jest.fn(),
    HeadBucketCommand: jest.fn(),
    PutBucketPolicyCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
  };
});

jest.mock("@aws-sdk/lib-storage", () => {
  return {
    Upload: jest.fn().mockImplementation(() => ({
      done: mockUploadDone,
    })),
  };
});

import { Readable } from "stream";

import { AccessTokenPayload, FileAccess, Policy } from "@athena/types";
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { IdentityService } from "../identity";
import { MediaQuota } from "./entities/media-quota.entity";
import { StoredFile } from "./entities/stored-file.entity";
import { MediaService } from "./media.service";

describe("MediaService", () => {
  let service: MediaService;
  let fileRepo: jest.Mocked<Repository<StoredFile>>;
  let quotaRepo: jest.Mocked<Repository<MediaQuota>>;
  let identityService: jest.Mocked<IdentityService>;

  const mockUser: AccessTokenPayload = {
    sub: "user-1",
    username: "student",
    role: "student",
    permissions: [],
  } as any;

  const mockFileEntity = {
    id: "file-1",
    bucket: "test-bucket",
    key: "user-1/uuid",
    originalName: "test.jpg",
    mimeType: "image/jpeg",
    size: "1024",
    access: FileAccess.Private,
    ownerId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as StoredFile;

  const qbMock = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: getRepositoryToken(StoredFile),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(qbMock),
          },
        },
        {
          provide: getRepositoryToken(MediaQuota),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === "STORAGE_BUCKET_NAME") return "athena-public";
              if (key === "STORAGE_ENDPOINT_PUBLIC") return "http://localhost:9000";
              if (key === "STORAGE_QUOTA_DEFAULT") return "104857600";
              return defaultValue;
            }),
          },
        },
        {
          provide: IdentityService,
          useValue: {
            applyPoliciesToQuery: jest.fn(),
            checkAbility: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    fileRepo = module.get(getRepositoryToken(StoredFile));
    quotaRepo = module.get(getRepositoryToken(MediaQuota));
    identityService = module.get(IdentityService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onModuleInit (Bucket Check)", () => {
    it("should check bucket existence and create if missing", async () => {
      mockS3Send.mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } });
      mockS3Send.mockResolvedValue({});

      await service.onModuleInit();
      expect(mockS3Send).toHaveBeenCalledTimes(3);
    });

    it("should do nothing if bucket exists", async () => {
      mockS3Send.mockResolvedValueOnce({});

      await service.onModuleInit();

      expect(mockS3Send).toHaveBeenCalledTimes(1);
    });
  });

  describe("upload", () => {
    const fileBuffer = Buffer.from("test");
    const uploadInput = {
      buffer: fileBuffer,
      originalname: "test.png",
      mimetype: "image/png",
      size: 500,
    };

    it("should upload file successfully", async () => {
      qbMock.getRawOne.mockResolvedValue({ total: "0" });

      mockUploadDone.mockResolvedValue({});

      fileRepo.create.mockReturnValue(mockFileEntity);
      fileRepo.save.mockResolvedValue(mockFileEntity);

      const result = await service.upload(uploadInput, mockUser, FileAccess.Private);

      expect(qbMock.select).toHaveBeenCalledWith("SUM(f.size)", "total");
      expect(mockUploadDone).toHaveBeenCalled();
      expect(fileRepo.save).toHaveBeenCalled();
      expect(result.url).toContain("/api/media/file-1/download");
    });

    it("should generate public URL for public access", async () => {
      qbMock.getRawOne.mockResolvedValue({ total: "0" });
      mockUploadDone.mockResolvedValue({});

      const publicFile = { ...mockFileEntity, access: FileAccess.Public };
      fileRepo.create.mockReturnValue(publicFile);
      fileRepo.save.mockResolvedValue(publicFile);

      const result = await service.upload(uploadInput, mockUser, FileAccess.Public);

      expect(result.url).toBe("http://localhost:9000/athena-public/user-1/uuid");
    });

    it("should throw PayloadTooLargeException if quota exceeded", async () => {
      qbMock.getRawOne.mockResolvedValue({ total: "99999999999" });

      await expect(service.upload(uploadInput, mockUser)).rejects.toBeInstanceOf(PayloadTooLargeException);

      expect(mockUploadDone).not.toHaveBeenCalled();
    });

    it("should throw InternalServerErrorException if S3 upload fails", async () => {
      qbMock.getRawOne.mockResolvedValue({ total: "0" });
      mockUploadDone.mockRejectedValue(new Error("S3 Down"));

      await expect(service.upload(uploadInput, mockUser)).rejects.toBeInstanceOf(InternalServerErrorException);

      expect(fileRepo.save).not.toHaveBeenCalled();
    });

    it("should rollback S3 file if DB save fails", async () => {
      qbMock.getRawOne.mockResolvedValue({ total: "0" });
      mockUploadDone.mockResolvedValue({});
      fileRepo.save.mockRejectedValue(new Error("DB Error"));

      await expect(service.upload(uploadInput, mockUser)).rejects.toBeInstanceOf(BadRequestException);

      expect(mockS3Send).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("should return paginated files with URLs", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[mockFileEntity], 1]);

      const result = await service.findAll(
        {
          page: 1,
          limit: 10,
          sortBy: "createdAt",
          sortOrder: "DESC",
          search: "",
        },
        "user-1",
      );

      expect(identityService.applyPoliciesToQuery).toHaveBeenCalled();
      expect(result.data[0].url).toBeDefined();
      expect(result.meta.total).toBe(1);
    });
  });

  describe("findOne", () => {
    it("should return file if access allowed", async () => {
      fileRepo.findOne.mockResolvedValue(mockFileEntity);
      identityService.checkAbility.mockReturnValue(true);

      const result = await service.findOne("file-1", "user-1", [Policy.OWN_ONLY]);

      expect(fileRepo.findOne).toHaveBeenCalledWith({ where: { id: "file-1" } });
      expect(result.id).toBe("file-1");
    });

    it("should throw ForbiddenException if access denied", async () => {
      fileRepo.findOne.mockResolvedValue(mockFileEntity);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.findOne("file-1", "user-1", [Policy.OWN_ONLY])).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("should throw NotFoundException if file missing", async () => {
      fileRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("xxx", "u1")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("getFileStream", () => {
    it("should return stream from S3", async () => {
      fileRepo.findOne.mockResolvedValue(mockFileEntity);
      identityService.checkAbility.mockReturnValue(true);

      const mockStream = new Readable();
      mockS3Send.mockResolvedValue({ Body: mockStream });

      const result = await service.getFileStream("file-1", "user-1");

      expect(result.stream).toBe(mockStream);
      expect(result.mimeType).toBe("image/jpeg");
    });

    it("should throw BadRequestException if S3 fails", async () => {
      fileRepo.findOne.mockResolvedValue(mockFileEntity);
      mockS3Send.mockRejectedValue(new Error("S3 Error"));

      await expect(service.getFileStream("file-1", "user-1")).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("delete", () => {
    it("should delete from S3 and DB", async () => {
      fileRepo.findOne.mockResolvedValue(mockFileEntity);
      identityService.checkAbility.mockReturnValue(true);

      await service.delete("file-1", "user-1");

      expect(mockS3Send).toHaveBeenCalled();
      expect(fileRepo.delete).toHaveBeenCalledWith("file-1");
    });
  });

  describe("Quota Management (Admin)", () => {
    it("setQuota should save entity", async () => {
      quotaRepo.create.mockReturnValue({ roleName: "student", limitBytes: "100" } as any);
      quotaRepo.save.mockResolvedValue({ roleName: "student", limitBytes: "100" } as any);

      await service.setQuota("student", 100);

      expect(quotaRepo.create).toHaveBeenCalledWith({ roleName: "student", limitBytes: "100" });
      expect(quotaRepo.save).toHaveBeenCalled();
    });

    it("handleRoleDeletedEvent should delete quota", async () => {
      quotaRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.handleRoleDeletedEvent({ name: "deleted_role" });

      expect(quotaRepo.delete).toHaveBeenCalledWith({ roleName: "deleted_role" });
    });
  });
});
