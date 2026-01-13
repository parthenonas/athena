import { Pageable, Policy } from "@athena/types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { CohortController } from "./cohort.controller";
import { CohortService } from "./cohort.service";
import { CreateCohortDto } from "./dto/create.dto";
import { FilterCohortDto } from "./dto/filter.dto";
import { ReadCohortDto } from "./dto/read.dto";
import { UpdateCohortDto } from "./dto/update.dto";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";

const MOCK_USER_ID = "user-123";
const MOCK_COHORT_ID = "cohort-abc";
const MOCK_APPLIED_POLICIES: Policy[] = [Policy.OWN_ONLY];

const mockReadCohort: ReadCohortDto = {
  id: MOCK_COHORT_ID,
  name: "Test Cohort",
  instructorId: MOCK_USER_ID,
  startDate: new Date(),
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreateDto: CreateCohortDto = {
  name: "New Cohort",
  instructorId: MOCK_USER_ID,
};

const mockFilterDto: FilterCohortDto = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "DESC",
};

const mockPageable: Pageable<ReadCohortDto> = {
  data: [mockReadCohort],
  meta: { total: 1, page: 1, limit: 10, pages: 1 },
};

describe("CohortController", () => {
  let controller: CohortController;
  let service: jest.Mocked<CohortService>;

  const mockReq = {
    user: { sub: MOCK_USER_ID },
    appliedPolicies: MOCK_APPLIED_POLICIES,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CohortController],
      providers: [
        {
          provide: CohortService,
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

    controller = module.get<CohortController>(CohortController);
    service = module.get(CohortService);
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
      service.findOne.mockResolvedValue(mockReadCohort);

      const result = await controller.findOne(MOCK_COHORT_ID, MOCK_USER_ID, mockReq);

      expect(service.findOne).toHaveBeenCalledWith(MOCK_COHORT_ID, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result).toEqual(mockReadCohort);
    });
  });

  describe("create", () => {
    it("should call service.create with DTO", async () => {
      service.create.mockResolvedValue(mockReadCohort);

      const result = await controller.create(mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(mockCreateDto);
      expect(result).toEqual(mockReadCohort);
    });
  });

  describe("update", () => {
    it("should call service.update and pass id, dto, userId, and policies", async () => {
      const updateData: UpdateCohortDto = { name: "Updated" };
      service.update.mockResolvedValue({ ...mockReadCohort, name: "Updated" });

      const result = await controller.update(MOCK_COHORT_ID, updateData, MOCK_USER_ID, mockReq);

      expect(service.update).toHaveBeenCalledWith(MOCK_COHORT_ID, updateData, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result.name).toBe("Updated");
    });
  });

  describe("delete", () => {
    it("should call service.delete and pass id, userId, and policies", async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.delete(MOCK_COHORT_ID, MOCK_USER_ID, mockReq);

      expect(service.delete).toHaveBeenCalledWith(MOCK_COHORT_ID, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
    });
  });
});
