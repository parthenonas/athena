import { Readable } from "stream";

import { AccessTokenPayload, FileAccess, Pageable, Permission, Policy } from "@athena/types";
import { BadRequestException, StreamableFile } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import type { Request, Response } from "express";

import { FilterFileDto } from "./dto/filter.dto";
import { ReadFileDto } from "./dto/read.dto";
import { SetQuotaDto } from "./dto/set-quota.dto";
import { UploadFileDto } from "./dto/upload.dto";
import { MediaQuota } from "./entities/media-quota.entity";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { AclGuard, JwtAuthGuard } from "../identity";

const USER_ID = "user-uuid";
const FILE_ID = "file-uuid";

const mockUserPayload: AccessTokenPayload = {
  sub: USER_ID,
  username: "tester",
  role: "student",
  permissions: [Permission.FILES_CREATE],
} as any;

const mockReadFileDto: ReadFileDto = {
  id: FILE_ID,
  url: "/api/media/file-uuid/download",
  originalName: "test.png",
  mimeType: "image/png",
  size: 1024,
  access: FileAccess.Private,
  ownerId: USER_ID,
  createdAt: new Date(),
};

describe("MediaController", () => {
  let controller: MediaController;
  let service: jest.Mocked<MediaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            getFileStream: jest.fn(),
            upload: jest.fn(),
            delete: jest.fn(),
            getQuotas: jest.fn(),
            setQuota: jest.fn(),
            getUsage: jest.fn(),
            deleteQuota: jest.fn(),
          },
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: AclGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    service = module.get(MediaService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("should call service.findAll with filters and policies", async () => {
      const filters: FilterFileDto = { page: 1, limit: 10 } as any;
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      const expectedResponse: Pageable<ReadFileDto> = {
        data: [mockReadFileDto],
        meta: { total: 1, page: 1, limit: 10, pages: 1 },
      };

      service.findAll.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(filters, USER_ID, req);

      expect(service.findAll).toHaveBeenCalledWith(filters, USER_ID, policies);
      expect(result).toEqual(expectedResponse);
    });

    it("should default appliedPolicies to empty array", async () => {
      const filters: FilterFileDto = {} as any;
      const req = {} as Request;
      service.findAll.mockResolvedValue({ data: [], meta: {} } as any);

      await controller.findAll(filters, USER_ID, req);

      expect(service.findAll).toHaveBeenCalledWith(filters, USER_ID, []);
    });
  });

  describe("findOne", () => {
    it("should return file metadata", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.findOne.mockResolvedValue(mockReadFileDto);

      const result = await controller.findOne(FILE_ID, USER_ID, req);

      expect(service.findOne).toHaveBeenCalledWith(FILE_ID, USER_ID, policies);
      expect(result).toEqual(mockReadFileDto);
    });
  });

  describe("download", () => {
    it("should set headers and return StreamableFile", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      const res = {
        set: jest.fn(),
      } as unknown as Response;

      const mockStream = new Readable();
      mockStream.push("content");
      mockStream.push(null);

      service.getFileStream.mockResolvedValue({
        stream: mockStream,
        mimeType: "text/plain",
        fileName: "hello.txt",
      });

      const result = await controller.download(FILE_ID, res, USER_ID, req);

      expect(service.getFileStream).toHaveBeenCalledWith(FILE_ID, USER_ID, policies);

      expect(res.set).toHaveBeenCalledWith({
        "Content-Type": "text/plain",
        "Content-Disposition": 'attachment; filename="hello.txt"',
      });

      expect(result).toBeInstanceOf(StreamableFile);
    });
  });

  describe("upload", () => {
    const mockFile = {
      buffer: Buffer.from("test"),
      originalname: "test.png",
      mimetype: "image/png",
      size: 1024,
    } as Express.Multer.File;

    const dto: UploadFileDto = { access: FileAccess.Private };

    it("should upload file using service", async () => {
      service.upload.mockResolvedValue(mockReadFileDto);

      const result = await controller.upload(mockFile, dto, mockUserPayload);

      expect(service.upload).toHaveBeenCalledWith(
        {
          buffer: mockFile.buffer,
          originalname: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
        },
        mockUserPayload,
        dto.access,
      );
      expect(result).toEqual(mockReadFileDto);
    });

    it("should throw BadRequestException if file is missing", async () => {
      await expect(controller.upload(undefined as any, dto, mockUserPayload)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(service.upload).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should call delete service method", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.delete.mockResolvedValue(undefined);

      await controller.delete(FILE_ID, USER_ID, req);

      expect(service.delete).toHaveBeenCalledWith(FILE_ID, USER_ID, policies);
    });
  });

  describe("listQuotas (Admin)", () => {
    it("should return list of quotas", async () => {
      const quotas = [{ roleName: "student", limitBytes: "100" }] as MediaQuota[];
      service.getQuotas.mockResolvedValue(quotas);

      const result = await controller.listQuotas();

      expect(service.getQuotas).toHaveBeenCalled();
      expect(result).toEqual(quotas);
    });
  });

  describe("setQuota (Admin)", () => {
    it("should call setQuota service method", async () => {
      const dto: SetQuotaDto = { roleName: "student", limitBytes: 500 };
      const expectedQuota = { roleName: "student", limitBytes: "500" } as MediaQuota;

      service.setQuota.mockResolvedValue(expectedQuota);

      const result = await controller.setQuota(dto);

      expect(service.setQuota).toHaveBeenCalledWith("student", 500);
      expect(result).toEqual(expectedQuota);
    });
  });

  describe("getMyUsage", () => {
    it("should return storage usage for current user", async () => {
      const mockUsage = { usedBytes: 500, limitBytes: 1000, percentage: 50 };

      service.getUsage.mockResolvedValue(mockUsage);

      const result = await controller.getMyUsage(mockUserPayload);

      expect(service.getUsage).toHaveBeenCalledWith(mockUserPayload.sub, mockUserPayload.role);
      expect(result).toEqual(mockUsage);
    });
  });

  describe("deleteQuota (Admin)", () => {
    it("should call deleteQuota service method", async () => {
      service.deleteQuota.mockResolvedValue(undefined);

      await controller.deleteQuota("student");

      expect(service.deleteQuota).toHaveBeenCalledWith("student");
    });
  });
});
