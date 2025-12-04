import { Pageable, Policy } from "@athena/types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";

import { CreateLessonDto } from "./dto/create.dto";
import { FilterLessonDto } from "./dto/filter.dto";
import { ReadLessonDto } from "./dto/read.dto";
import { UpdateLessonDto } from "./dto/update.dto";
import { LessonController } from "./lesson.controller";
import { LessonService } from "./lesson.service";
import { AclGuard, JwtAuthGuard } from "../../identity";

const USER_ID = "user-uuid";
const LESSON_ID = "lesson-uuid";
const COURSE_ID = "course-uuid";

const mockReadLesson: ReadLessonDto = {
  id: LESSON_ID,
  title: "Test Lesson",
  courseId: COURSE_ID,
  goals: null,
  order: 1,
  isDraft: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPageable: Pageable<ReadLessonDto> = {
  data: [mockReadLesson],
  meta: { total: 1, page: 1, limit: 10, pages: 1 },
};

describe("LessonController", () => {
  let controller: LessonController;
  let service: jest.Mocked<LessonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonController],
      providers: [
        {
          provide: LessonService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
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

    controller = module.get<LessonController>(LessonController);
    service = module.get(LessonService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("should call service.findAll with extracted policies", async () => {
      const filters: FilterLessonDto = { courseId: COURSE_ID, page: 1, limit: 10 } as any;
      const policies = [Policy.OWN_ONLY];

      const req = { appliedPolicies: policies } as unknown as Request;

      service.findAll.mockResolvedValue(mockPageable);

      const result = await controller.findAll(filters, USER_ID, req);

      expect(service.findAll).toHaveBeenCalledWith(filters, USER_ID, policies);
      expect(result).toEqual(mockPageable);
    });

    it("should default appliedPolicies to empty array if undefined", async () => {
      const filters: FilterLessonDto = {} as any;
      const req = {} as Request;

      service.findAll.mockResolvedValue(mockPageable);

      await controller.findAll(filters, USER_ID, req);

      expect(service.findAll).toHaveBeenCalledWith(filters, USER_ID, []);
    });
  });

  describe("findOne", () => {
    it("should return a single lesson", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.findOne.mockResolvedValue(mockReadLesson);

      const result = await controller.findOne(LESSON_ID, USER_ID, req);

      expect(service.findOne).toHaveBeenCalledWith(LESSON_ID, USER_ID, policies);
      expect(result).toEqual(mockReadLesson);
    });
  });

  describe("create", () => {
    it("should create a lesson (no policies needed from request)", async () => {
      const dto: CreateLessonDto = { title: "New", courseId: COURSE_ID };

      service.create.mockResolvedValue(mockReadLesson);

      const result = await controller.create(dto, USER_ID);

      expect(service.create).toHaveBeenCalledWith(dto, USER_ID);
      expect(result).toEqual(mockReadLesson);
    });
  });

  describe("update", () => {
    it("should update lesson passing policies", async () => {
      const dto: UpdateLessonDto = { title: "Updated" };
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.update.mockResolvedValue({ ...mockReadLesson, title: "Updated" });

      const result = await controller.update(LESSON_ID, dto, USER_ID, req);

      expect(service.update).toHaveBeenCalledWith(LESSON_ID, dto, USER_ID, policies);
      expect(result.title).toBe("Updated");
    });
  });

  describe("softDelete", () => {
    it("should call softDelete service method", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = { appliedPolicies: policies } as unknown as Request;

      service.softDelete.mockResolvedValue(undefined);

      await controller.softDelete(LESSON_ID, USER_ID, req);

      expect(service.softDelete).toHaveBeenCalledWith(LESSON_ID, USER_ID, policies);
    });
  });
});
