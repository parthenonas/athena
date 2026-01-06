import { BlockRequiredAction, BlockType, Policy, ProgrammingLanguage } from "@athena/types";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { BlockService } from "./block.service";
import { CreateBlockDto } from "./dto/create.dto";
import { ReorderBlockDto, UpdateBlockDto } from "./dto/update.dto";
import { Block } from "./entities/block.entity";
import { IdentityService } from "../../identity";
import { SubmissionQueueService } from "../../submission-queue";
import { BlockDryRunDto } from "./dto/dry-run.dto";
import { Course } from "../course/entities/course.entity";
import { Lesson } from "../lesson/entities/lesson.entity";

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const COURSE_ID = "course-1";
const LESSON_ID = "lesson-1";
const BLOCK_ID = "block-1";

const mockCourse = {
  id: COURSE_ID,
  title: "Test Course",
  ownerId: USER_ID,
} as Course;

const mockLesson = {
  id: LESSON_ID,
  title: "Test Lesson",
  courseId: COURSE_ID,
  course: mockCourse,
} as Lesson;

const mockBlock = {
  id: BLOCK_ID,
  lessonId: LESSON_ID,
  lesson: mockLesson,
  type: BlockType.Text,
  content: { json: { type: "doc" } },
  orderIndex: 1024,
  requiredAction: BlockRequiredAction.VIEW,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Block;

describe("BlockService", () => {
  let service: BlockService;
  let blockRepo: jest.Mocked<Repository<Block>>;
  let lessonRepo: jest.Mocked<Repository<Lesson>>;
  let identityService: jest.Mocked<IdentityService>;
  let submissionQueue: jest.Mocked<SubmissionQueueService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockService,
        {
          provide: getRepositoryToken(Block),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Lesson),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: IdentityService,
          useValue: {
            checkAbility: jest.fn(),
          },
        },
        {
          provide: SubmissionQueueService,
          useValue: {
            sendForExecution: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BlockService>(BlockService);
    blockRepo = module.get(getRepositoryToken(Block));
    lessonRepo = module.get(getRepositoryToken(Lesson));
    identityService = module.get(IdentityService);
    submissionQueue = module.get(SubmissionQueueService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto: CreateBlockDto = {
      lessonId: LESSON_ID,
      type: BlockType.Text,
      content: { json: { foo: "bar" } },
    };

    it("should create a block successfully (Owner) with auto-order", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      blockRepo.findOne.mockResolvedValue(null);
      blockRepo.create.mockReturnValue({ ...mockBlock, orderIndex: 1024 } as Block);
      blockRepo.save.mockResolvedValue({ ...mockBlock, orderIndex: 1024 } as Block);

      const result = await service.create(createDto, USER_ID);

      expect(lessonRepo.findOne).toHaveBeenCalledWith({ where: { id: LESSON_ID }, relations: ["course"] });
      expect(blockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ orderIndex: 1024 }));
      expect(result.id).toBe(BLOCK_ID);
    });

    it("should calculate correct order index if blocks exist", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      blockRepo.findOne.mockResolvedValue({ orderIndex: 2048 } as Block);

      blockRepo.create.mockImplementation(dto => dto as Block);
      blockRepo.save.mockImplementation(ent => Promise.resolve({ ...ent, id: "new-id" } as Block));

      const result = await service.create(createDto, USER_ID);
      expect(result.orderIndex).toBe(3072);
    });

    it("should throw NotFoundException if lesson not found", async () => {
      lessonRepo.findOne.mockResolvedValue(null);
      await expect(service.create(createDto, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if user is NOT the course owner", async () => {
      const otherLesson = { ...mockLesson, course: { ...mockCourse, ownerId: OTHER_USER_ID } } as Lesson;
      lessonRepo.findOne.mockResolvedValue(otherLesson);

      await expect(service.create(createDto, USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException on Invalid Content Schema (Polymorphism)", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);

      const invalidDto: CreateBlockDto = {
        lessonId: LESSON_ID,
        type: BlockType.Code,
        content: { garbage: "data" },
      };

      await expect(service.create(invalidDto, USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe("findAllByLesson", () => {
    it("should return blocks if allowed", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(true);
      blockRepo.find.mockResolvedValue([mockBlock]);

      const result = await service.findAllByLesson(LESSON_ID, USER_ID, [Policy.OWN_ONLY]);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockCourse);
      expect(blockRepo.find).toHaveBeenCalledWith({
        where: { lessonId: LESSON_ID },
        order: { orderIndex: "ASC" },
      });
      expect(result[0].id).toBe(BLOCK_ID);
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.findAllByLesson(LESSON_ID, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(ForbiddenException);
    });
  });

  describe("findOne", () => {
    it("should return block if found and allowed", async () => {
      blockRepo.findOne.mockResolvedValue(mockBlock);
      identityService.checkAbility.mockReturnValue(true);

      const result = await service.findOne(BLOCK_ID, USER_ID, [Policy.OWN_ONLY]);

      expect(blockRepo.findOne).toHaveBeenCalledWith({
        where: { id: BLOCK_ID },
        relations: ["lesson", "lesson.course"],
      });
      expect(result.id).toBe(BLOCK_ID);
    });

    it("should throw NotFoundException if block missing", async () => {
      blockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("bad-id", USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    const updateDto: UpdateBlockDto = {
      content: { json: { new: "content" } },
    };

    it("should update block if allowed and content valid", async () => {
      blockRepo.findOne.mockResolvedValue(mockBlock);
      identityService.checkAbility.mockReturnValue(true);
      blockRepo.save.mockImplementation(ent => Promise.resolve(ent as any));

      const result = await service.update(BLOCK_ID, updateDto, USER_ID, [Policy.OWN_ONLY]);

      expect(blockRepo.save).toHaveBeenCalled();
      expect(result.content).toEqual(updateDto.content);
    });

    it("should throw BadRequestException if switching type to Code with invalid content", async () => {
      blockRepo.findOne.mockResolvedValue(mockBlock);
      identityService.checkAbility.mockReturnValue(true);

      const badUpdateDto: UpdateBlockDto = {
        type: BlockType.Code,
        content: { just: "trash" },
      };

      await expect(service.update(BLOCK_ID, badUpdateDto, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it("should allow switching type to Code with VALID content", async () => {
      blockRepo.findOne.mockResolvedValue(mockBlock);
      identityService.checkAbility.mockReturnValue(true);
      blockRepo.save.mockImplementation(ent => Promise.resolve(ent as any));

      const validCodeUpdate: UpdateBlockDto = {
        type: BlockType.Code,
        content: {
          taskText: { json: {} },
          language: ProgrammingLanguage.Python,
          initialCode: "print('Hello')",
        },
      };

      const result = await service.update(BLOCK_ID, validCodeUpdate, USER_ID);
      expect(result.type).toBe(BlockType.Code);
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      blockRepo.findOne.mockResolvedValue(mockBlock);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.update(BLOCK_ID, updateDto, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(ForbiddenException);
    });
  });

  describe("reorder", () => {
    const reorderDto: ReorderBlockDto = { newOrderIndex: 1500.5 };

    it("should update order index if allowed", async () => {
      blockRepo.findOne.mockResolvedValue(mockBlock);
      identityService.checkAbility.mockReturnValue(true);
      blockRepo.save.mockImplementation(ent => Promise.resolve(ent as Block));

      const result = await service.reorder(BLOCK_ID, reorderDto, USER_ID, [Policy.OWN_ONLY]);

      expect(result.orderIndex).toBe(1500.5);
      expect(blockRepo.save).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      blockRepo.findOne.mockResolvedValue(mockBlock);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.reorder(BLOCK_ID, reorderDto, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("remove", () => {
    it("should remove block if allowed", async () => {
      blockRepo.findOne.mockResolvedValue(mockBlock);
      identityService.checkAbility.mockReturnValue(true);
      blockRepo.remove.mockResolvedValue(mockBlock);

      await service.remove(BLOCK_ID, USER_ID, [Policy.OWN_ONLY]);

      expect(blockRepo.remove).toHaveBeenCalledWith(mockBlock);
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      blockRepo.findOne.mockResolvedValue(mockBlock);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.remove(BLOCK_ID, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(ForbiddenException);
    });
  });

  describe("dryRun", () => {
    const dryRunDto: BlockDryRunDto = {
      lessonId: LESSON_ID,
      content: {
        taskText: { json: {} },
        language: ProgrammingLanguage.Python,
        initialCode: "print('test')",
        executionMode: "io_check" as any,
      },
      socketId: "socket-123",
      blockId: "block-123",
    };

    it("should initiate dry run if allowed", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(true);
      submissionQueue.sendForExecution.mockResolvedValue({ submissionId: "uuid", status: "queued" });

      await service.dryRun(dryRunDto, USER_ID, [Policy.OWN_ONLY]);

      expect(lessonRepo.findOne).toHaveBeenCalledWith({ where: { id: LESSON_ID }, relations: ["course"] });
      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockCourse);

      expect(submissionQueue.sendForExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          content: dryRunDto.content,
          metadata: expect.objectContaining({
            socketId: dryRunDto.socketId,
            lessonId: LESSON_ID,
          }),
        }),
      );
    });

    it("should throw NotFoundException if lesson missing", async () => {
      lessonRepo.findOne.mockResolvedValue(null);
      await expect(service.dryRun(dryRunDto, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.dryRun(dryRunDto, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(ForbiddenException);
    });
  });
});
