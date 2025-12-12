import { BlockType, CodeExecutionMode, Policy, ProgrammingLanguage } from "@athena/types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";

import { BlockController } from "./block.controller";
import { BlockService } from "./block.service";
import { CreateBlockDto } from "./dto/create.dto";
import { ReadBlockDto } from "./dto/read.dto";
import { ReorderBlockDto, UpdateBlockDto } from "./dto/update.dto";
import { AclGuard, JwtAuthGuard } from "../../identity";
import { BlockDryRunDto } from "./dto/dry-run.dto";

const USER_ID = "user-uuid";
const LESSON_ID = "lesson-uuid";
const BLOCK_ID = "block-uuid";

const mockReadBlock: ReadBlockDto = {
  id: BLOCK_ID,
  lessonId: LESSON_ID,
  type: BlockType.Text,
  content: { json: { type: "doc" } },
  orderIndex: 1024,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("BlockController", () => {
  let controller: BlockController;
  let service: jest.Mocked<BlockService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockController],
      providers: [
        {
          provide: BlockService,
          useValue: {
            create: jest.fn(),
            findAllByLesson: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            reorder: jest.fn(),
            remove: jest.fn(),
            dryRun: jest.fn(),
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

    controller = module.get<BlockController>(BlockController);
    service = module.get(BlockService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a block (no policies needed from request)", async () => {
      const dto: CreateBlockDto = {
        lessonId: LESSON_ID,
        type: BlockType.Text,
        content: { text: "hello" },
      };

      service.create.mockResolvedValue(mockReadBlock);

      const result = await controller.create(dto, USER_ID);

      expect(service.create).toHaveBeenCalledWith(dto, USER_ID);
      expect(result).toEqual(mockReadBlock);
    });
  });

  describe("findAllByLesson", () => {
    it("should call service.findAllByLesson with extracted policies", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.findAllByLesson.mockResolvedValue([mockReadBlock]);

      const result = await controller.findAllByLesson(LESSON_ID, USER_ID, req);

      expect(service.findAllByLesson).toHaveBeenCalledWith(LESSON_ID, USER_ID, policies);
      expect(result).toEqual([mockReadBlock]);
    });

    it("should default appliedPolicies to empty array if undefined", async () => {
      const req = {} as Request;

      service.findAllByLesson.mockResolvedValue([mockReadBlock]);

      await controller.findAllByLesson(LESSON_ID, USER_ID, req);

      expect(service.findAllByLesson).toHaveBeenCalledWith(LESSON_ID, USER_ID, []);
    });
  });

  describe("findOne", () => {
    it("should return a single block", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.findOne.mockResolvedValue(mockReadBlock);

      const result = await controller.findOne(BLOCK_ID, USER_ID, req);

      expect(service.findOne).toHaveBeenCalledWith(BLOCK_ID, USER_ID, policies);
      expect(result).toEqual(mockReadBlock);
    });
  });

  describe("update", () => {
    it("should update block passing policies", async () => {
      const dto: UpdateBlockDto = { content: { new: "data" } };
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.update.mockResolvedValue({ ...mockReadBlock, content: { new: "data" } });

      const result = await controller.update(BLOCK_ID, dto, USER_ID, req);

      expect(service.update).toHaveBeenCalledWith(BLOCK_ID, dto, USER_ID, policies);
      expect(result.content).toEqual({ new: "data" });
    });
  });

  describe("reorder", () => {
    it("should call reorder service method", async () => {
      const dto: ReorderBlockDto = { newOrderIndex: 1500 };
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.reorder.mockResolvedValue({ ...mockReadBlock, orderIndex: 1500 });

      const result = await controller.reorder(BLOCK_ID, dto, USER_ID, req);

      expect(service.reorder).toHaveBeenCalledWith(BLOCK_ID, dto, USER_ID, policies);
      expect(result.orderIndex).toBe(1500);
    });
  });

  describe("remove", () => {
    it("should call remove service method", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.remove.mockResolvedValue(undefined);

      await controller.remove(BLOCK_ID, USER_ID, req);

      expect(service.remove).toHaveBeenCalledWith(BLOCK_ID, USER_ID, policies);
    });
  });

  describe("dryRun", () => {
    const dryRunDto: BlockDryRunDto = {
      lessonId: LESSON_ID,
      socketId: "socket-abc-123",
      content: {
        language: ProgrammingLanguage.Python,
        initialCode: "print('Hello World')",
        executionMode: CodeExecutionMode.IoCheck,
      },
    };

    it("should call dryRun service method with extracted policies", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.dryRun.mockResolvedValue(undefined);

      await controller.dryRun(dryRunDto, USER_ID, req);

      expect(service.dryRun).toHaveBeenCalledWith(dryRunDto, USER_ID, policies);
    });

    it("should default appliedPolicies to empty array", async () => {
      const req = {} as Request;

      service.dryRun.mockResolvedValue(undefined);

      await controller.dryRun(dryRunDto, USER_ID, req);

      expect(service.dryRun).toHaveBeenCalledWith(dryRunDto, USER_ID, []);
    });
  });
});
