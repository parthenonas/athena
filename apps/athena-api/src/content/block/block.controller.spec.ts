import {
  BlockRequiredAction,
  BlockType,
  CodeExecutionMode,
  Pageable,
  Policy,
  ProgrammingLanguage,
} from "@athena/types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";

import { BlockController } from "./block.controller";
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
import { AclGuard, JwtAuthGuard } from "../../identity";

const USER_ID = "user-uuid";
const LESSON_ID = "lesson-uuid";
const BLOCK_ID = "block-uuid";
const LIBRARY_BLOCK_ID = "library-block-uuid";

const mockReadBlock: ReadBlockDto = {
  id: BLOCK_ID,
  lessonId: LESSON_ID,
  type: BlockType.Text,
  content: { json: { type: "doc" } },
  orderIndex: 1024,
  requiredAction: BlockRequiredAction.VIEW,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockReadLibraryBlock: ReadLibraryBlockDto = {
  id: LIBRARY_BLOCK_ID,
  ownerId: USER_ID,
  type: BlockType.Text,
  tags: ["theory"],
  content: { json: { type: "doc" } },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("BlockController", () => {
  let controller: BlockController;
  let service: jest.Mocked<BlockService>;
  let libraryService: jest.Mocked<BlockLibraryService>;

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
          provide: BlockLibraryService,
          useValue: {
            createLibraryBlock: jest.fn(),
            findLibraryBlocks: jest.fn(),
            findOneLibraryBlock: jest.fn(),
            updateLibraryBlock: jest.fn(),
            removeLibraryBlock: jest.fn(),
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
    libraryService = module.get(BlockLibraryService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a block (no policies needed from request)", async () => {
      const dto: CreateBlockDto = {
        lessonId: LESSON_ID,
        type: BlockType.Text,
        content: { json: { text: "hello" } },
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
      const dto: UpdateBlockDto = { content: { json: { new: "data" } } };
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.update.mockResolvedValue({ ...mockReadBlock, content: { json: { new: "data" } } });

      const result = await controller.update(BLOCK_ID, dto, USER_ID, req);

      expect(service.update).toHaveBeenCalledWith(BLOCK_ID, dto, USER_ID, policies);
      expect(result.content).toEqual({ json: { new: "data" } });
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
      socketId: "socket-abc-123",
      blockId: "block-123",
      content: {
        taskText: { json: {} },
        language: ProgrammingLanguage.Python,
        initialCode: "print('Hello World')",
        executionMode: CodeExecutionMode.IoCheck,
      },
    };

    it("should call dryRun service method without policies", async () => {
      service.dryRun.mockResolvedValue(undefined);

      await controller.dryRun(dryRunDto, USER_ID);

      expect(service.dryRun).toHaveBeenCalledWith(dryRunDto, USER_ID);
    });
  });

  describe("createLibraryBlock", () => {
    it("should create a library block", async () => {
      const dto: CreateLibraryBlockDto = {
        type: BlockType.Text,
        tags: ["theory"],
        content: { json: { text: "hello" } },
      };

      libraryService.createLibraryBlock.mockResolvedValue(mockReadLibraryBlock);

      const result = await controller.createLibraryBlock(dto, USER_ID);

      expect(libraryService.createLibraryBlock).toHaveBeenCalledWith(dto, USER_ID);
      expect(result).toEqual(mockReadLibraryBlock);
    });
  });

  describe("findLibraryBlocks", () => {
    it("should find library blocks with pagination", async () => {
      const dto: FilterLibraryBlockDto = { page: 1, limit: 10 } as any;
      const expectedResponse: Pageable<ReadLibraryBlockDto> = {
        data: [mockReadLibraryBlock],
        meta: { total: 1, page: 1, limit: 10, pages: 1 },
      };

      libraryService.findLibraryBlocks.mockResolvedValue(expectedResponse);

      const result = await controller.findLibraryBlocks(dto, USER_ID);

      expect(libraryService.findLibraryBlocks).toHaveBeenCalledWith(dto, USER_ID);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe("findOneLibraryBlock", () => {
    it("should return a single library block and extract policies", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      libraryService.findOneLibraryBlock.mockResolvedValue(mockReadLibraryBlock);

      const result = await controller.findOneLibraryBlock(LIBRARY_BLOCK_ID, USER_ID, req);

      expect(libraryService.findOneLibraryBlock).toHaveBeenCalledWith(LIBRARY_BLOCK_ID, USER_ID, policies);
      expect(result).toEqual(mockReadLibraryBlock);
    });

    it("should default appliedPolicies to empty array if undefined", async () => {
      const req = {} as Request;

      libraryService.findOneLibraryBlock.mockResolvedValue(mockReadLibraryBlock);

      await controller.findOneLibraryBlock(LIBRARY_BLOCK_ID, USER_ID, req);

      expect(libraryService.findOneLibraryBlock).toHaveBeenCalledWith(LIBRARY_BLOCK_ID, USER_ID, []);
    });
  });

  describe("updateLibraryBlock", () => {
    it("should update library block passing policies", async () => {
      const dto: UpdateLibraryBlockDto = { content: { json: { updated: "yes" } } };
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      libraryService.updateLibraryBlock.mockResolvedValue({ ...mockReadLibraryBlock, content: dto.content as any });

      const result = await controller.updateLibraryBlock(LIBRARY_BLOCK_ID, dto, USER_ID, req);

      expect(libraryService.updateLibraryBlock).toHaveBeenCalledWith(LIBRARY_BLOCK_ID, dto, USER_ID, policies);
      expect(result.content).toEqual(dto.content);
    });
  });

  describe("removeLibraryBlock", () => {
    it("should remove library block passing policies", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      libraryService.removeLibraryBlock.mockResolvedValue(undefined);

      await controller.removeLibraryBlock(LIBRARY_BLOCK_ID, USER_ID, req);

      expect(libraryService.removeLibraryBlock).toHaveBeenCalledWith(LIBRARY_BLOCK_ID, USER_ID, policies);
    });
  });
});
