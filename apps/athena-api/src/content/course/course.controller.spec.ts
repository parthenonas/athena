import { Policy, Pageable } from "@athena/types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { CourseController } from "./course.controller";
import { CourseService } from "./course.service";
import { CreateCourseDto } from "./dto/create.dto";
import { FilterCourseDto } from "./dto/filter.dto";
import { ReadCourseDto } from "./dto/read.dto";
import { UpdateCourseDto } from "./dto/update.dto";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";

const MOCK_USER_ID = "user-123";
const MOCK_COURSE_ID = "course-abc";
const MOCK_APPLIED_POLICIES: Policy[] = [Policy.OWN_ONLY];

const mockReadCourse: ReadCourseDto = {
  id: MOCK_COURSE_ID,
  title: "Test Course",
  description: "Desc",
  ownerId: MOCK_USER_ID,
  tags: [],
  isPublished: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreateDto: CreateCourseDto = {
  title: "New Course",
  description: "New Desc",
};

const mockFilterDto: FilterCourseDto = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "DESC",
};

const mockPageable: Pageable<ReadCourseDto> = {
  data: [mockReadCourse],
  meta: { total: 1, page: 1, limit: 10, pages: 1 },
};

describe("CourseController", () => {
  let controller: CourseController;
  let service: jest.Mocked<CourseService>;

  const mockReq = {
    user: { sub: MOCK_USER_ID },
    appliedPolicies: MOCK_APPLIED_POLICIES,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        {
          provide: CourseService,
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

    controller = module.get<CourseController>(CourseController);
    service = module.get(CourseService);
  });

  describe("findAll", () => {
    it("should call service.findAll and pass filters, userId, and appliedPolicies", async () => {
      service.findAll.mockResolvedValue(mockPageable);

      const result = await controller.findAll(mockFilterDto, MOCK_USER_ID, mockReq);

      expect(service.findAll).toHaveBeenCalledWith(mockFilterDto, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result).toEqual(mockPageable);
    });
  });

  describe("findOne", () => {
    it("should call service.findOne and pass id, userId, and appliedPolicies", async () => {
      service.findOne.mockResolvedValue(mockReadCourse);

      const result = await controller.findOne(MOCK_COURSE_ID, MOCK_USER_ID, mockReq);

      expect(service.findOne).toHaveBeenCalledWith(MOCK_COURSE_ID, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result).toEqual(mockReadCourse);
    });
  });

  describe("create", () => {
    it("should call service.create with DTO and userId from token", async () => {
      service.create.mockResolvedValue(mockReadCourse);

      const result = await controller.create(MOCK_USER_ID, mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(mockCreateDto, MOCK_USER_ID);
      expect(result).toEqual(mockReadCourse);
    });
  });

  describe("update", () => {
    it("should call service.update and pass id, dto, userId, and policies", async () => {
      const updateData: UpdateCourseDto = { title: "Updated" };
      service.update.mockResolvedValue({ ...mockReadCourse, title: "Updated" });

      const result = await controller.update(MOCK_USER_ID, MOCK_COURSE_ID, updateData, mockReq);

      expect(service.update).toHaveBeenCalledWith(MOCK_COURSE_ID, updateData, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result.title).toBe("Updated");
    });
  });

  describe("softDelete", () => {
    it("should call service.softDelete and send 204 status", async () => {
      service.softDelete.mockResolvedValue(undefined);

      await controller.softDelete(MOCK_USER_ID, MOCK_COURSE_ID, mockReq);

      expect(service.softDelete).toHaveBeenCalledWith(MOCK_COURSE_ID, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
    });
  });
});
