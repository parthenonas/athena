import { EnrollmentStatus, Pageable, Policy } from "@athena/types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { CreateEnrollmentDto } from "./dto/create.dto";
import { FilterEnrollmentDto } from "./dto/filter.dto";
import { ReadEnrollmentDto } from "./dto/read.dto";
import { UpdateEnrollmentDto } from "./dto/update.dto";
import { EnrollmentController } from "./enrollment.controller";
import { EnrollmentService } from "./enrollment.service";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";

const MOCK_USER_ID = "user-123";
const MOCK_ENROLLMENT_ID = "enrollment-abc";
const MOCK_COHORT_ID = "cohort-xyz";
const MOCK_APPLIED_POLICIES: Policy[] = [Policy.OWN_ONLY];

const mockReadEnrollment: ReadEnrollmentDto = {
  id: MOCK_ENROLLMENT_ID,
  cohortId: MOCK_COHORT_ID,
  ownerId: MOCK_USER_ID,
  status: EnrollmentStatus.Active,
  enrolledAt: new Date(),
};

const mockCreateDto: CreateEnrollmentDto = {
  cohortId: MOCK_COHORT_ID,
  ownerId: MOCK_USER_ID,
};

const mockFilterDto: FilterEnrollmentDto = {
  page: 1,
  limit: 10,
  sortBy: "enrolledAt",
  sortOrder: "DESC",
};

const mockPageable: Pageable<ReadEnrollmentDto> = {
  data: [mockReadEnrollment],
  meta: { total: 1, page: 1, limit: 10, pages: 1 },
};

describe("EnrollmentController", () => {
  let controller: EnrollmentController;
  let service: jest.Mocked<EnrollmentService>;

  const mockReq = {
    user: { sub: MOCK_USER_ID },
    appliedPolicies: MOCK_APPLIED_POLICIES,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentController],
      providers: [
        {
          provide: EnrollmentService,
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

    controller = module.get<EnrollmentController>(EnrollmentController);
    service = module.get(EnrollmentService);
  });

  describe("findAll", () => {
    it("should return enrollments list", async () => {
      service.findAll.mockResolvedValue(mockPageable);

      const result = await controller.findAll(mockFilterDto, MOCK_USER_ID, mockReq);

      expect(service.findAll).toHaveBeenCalledWith(mockFilterDto, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result).toEqual(mockPageable);
    });
  });

  describe("findOne", () => {
    it("should return single enrollment", async () => {
      service.findOne.mockResolvedValue(mockReadEnrollment);

      const result = await controller.findOne(MOCK_ENROLLMENT_ID, MOCK_USER_ID, mockReq);

      expect(service.findOne).toHaveBeenCalledWith(MOCK_ENROLLMENT_ID, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result).toEqual(mockReadEnrollment);
    });
  });

  describe("create", () => {
    it("should create enrollment", async () => {
      service.create.mockResolvedValue(mockReadEnrollment);

      const result = await controller.create(mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(mockCreateDto);
      expect(result).toEqual(mockReadEnrollment);
    });
  });

  describe("update", () => {
    it("should update enrollment status", async () => {
      const updateData: UpdateEnrollmentDto = { status: EnrollmentStatus.Completed };
      service.update.mockResolvedValue({ ...mockReadEnrollment, status: EnrollmentStatus.Completed });

      const result = await controller.update(MOCK_ENROLLMENT_ID, updateData, MOCK_USER_ID, mockReq);

      expect(service.update).toHaveBeenCalledWith(MOCK_ENROLLMENT_ID, updateData, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result.status).toBe(EnrollmentStatus.Completed);
    });
  });

  describe("delete", () => {
    it("should delete enrollment and return 204", async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.delete(MOCK_ENROLLMENT_ID, MOCK_USER_ID, mockReq);

      expect(service.delete).toHaveBeenCalledWith(MOCK_ENROLLMENT_ID, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
    });
  });
});
