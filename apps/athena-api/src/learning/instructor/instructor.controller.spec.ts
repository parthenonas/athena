import { Pageable, Policy } from "@athena/types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { CreateInstructorDto } from "./dto/create.dto";
import { FilterInstructorDto } from "./dto/filter.dto";
import { ReadInstructorDto } from "./dto/read.dto";
import { UpdateInstructorDto } from "./dto/update.dto";
import { InstructorController } from "./instructor.controller";
import { InstructorService } from "./instructor.service";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";

const MOCK_USER_ID = "user-123";
const MOCK_INSTRUCTOR_ID = "inst-abc";
const MOCK_APPLIED_POLICIES: Policy[] = [Policy.OWN_ONLY];

const mockReadInstructor: ReadInstructorDto = {
  id: MOCK_INSTRUCTOR_ID,
  ownerId: MOCK_USER_ID,
  bio: "Bio",
  title: "Prof",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreateDto: CreateInstructorDto = {
  ownerId: MOCK_USER_ID,
  bio: "Bio",
  title: "Prof",
};

const mockFilterDto: FilterInstructorDto = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "DESC",
};

const mockPageable: Pageable<ReadInstructorDto> = {
  data: [mockReadInstructor],
  meta: { total: 1, page: 1, limit: 10, pages: 1 },
};

describe("InstructorController", () => {
  let controller: InstructorController;
  let service: jest.Mocked<InstructorService>;

  const mockReq = {
    user: { sub: MOCK_USER_ID },
    appliedPolicies: MOCK_APPLIED_POLICIES,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstructorController],
      providers: [
        {
          provide: InstructorService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
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

    controller = module.get<InstructorController>(InstructorController);
    service = module.get(InstructorService);
  });

  describe("findAll", () => {
    it("should return instructors list", async () => {
      service.findAll.mockResolvedValue(mockPageable);

      const result = await controller.findAll(mockFilterDto, MOCK_USER_ID, mockReq);

      expect(service.findAll).toHaveBeenCalledWith(mockFilterDto, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result).toEqual(mockPageable);
    });
  });

  describe("findOne", () => {
    it("should return single instructor", async () => {
      service.findOne.mockResolvedValue(mockReadInstructor);

      const result = await controller.findOne(MOCK_INSTRUCTOR_ID, MOCK_USER_ID, mockReq);

      expect(service.findOne).toHaveBeenCalledWith(MOCK_INSTRUCTOR_ID, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result).toEqual(mockReadInstructor);
    });
  });

  describe("create", () => {
    it("should create instructor", async () => {
      service.create.mockResolvedValue(mockReadInstructor);

      const result = await controller.create(mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(mockCreateDto);
      expect(result).toEqual(mockReadInstructor);
    });
  });

  describe("update", () => {
    it("should pass update data along with userId and policies", async () => {
      const updateData: UpdateInstructorDto = { bio: "New Bio" };
      service.update.mockResolvedValue({ ...mockReadInstructor, bio: "New Bio" });

      const result = await controller.update(MOCK_INSTRUCTOR_ID, updateData, MOCK_USER_ID, mockReq);

      expect(service.update).toHaveBeenCalledWith(MOCK_INSTRUCTOR_ID, updateData, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result.bio).toBe("New Bio");
    });
  });

  describe("delete", () => {
    it("should pass delete request along with userId and policies", async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.delete(MOCK_INSTRUCTOR_ID, MOCK_USER_ID, mockReq);

      expect(service.delete).toHaveBeenCalledWith(MOCK_INSTRUCTOR_ID, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
    });
  });
});
