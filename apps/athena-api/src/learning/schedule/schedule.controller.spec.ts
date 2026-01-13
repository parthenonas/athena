import { Pageable, Policy } from "@athena/types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { CreateScheduleDto } from "./dto/create.dto";
import { FilterScheduleDto } from "./dto/filter.dto";
import { ReadScheduleDto } from "./dto/read.dto";
import { UpdateScheduleDto } from "./dto/update.dto";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
import { JwtAuthGuard } from "../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../identity/acl/acl.guard";

const MOCK_USER_ID = "user-123";
const MOCK_SCHEDULE_ID = "schedule-abc";
const MOCK_COHORT_ID = "cohort-xyz";
const MOCK_LESSON_ID = "lesson-123";
const MOCK_APPLIED_POLICIES: Policy[] = [Policy.OWN_ONLY];

const mockReadSchedule: ReadScheduleDto = {
  id: MOCK_SCHEDULE_ID,
  cohortId: MOCK_COHORT_ID,
  lessonId: MOCK_LESSON_ID,
  startAt: new Date(),
  endAt: null,
  isOpenManually: false,
  configOverrides: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreateDto: CreateScheduleDto = {
  cohortId: MOCK_COHORT_ID,
  lessonId: MOCK_LESSON_ID,
};

const mockFilterDto: FilterScheduleDto = {
  page: 1,
  limit: 10,
  sortBy: "startAt",
  sortOrder: "DESC",
};

const mockPageable: Pageable<ReadScheduleDto> = {
  data: [mockReadSchedule],
  meta: { total: 1, page: 1, limit: 10, pages: 1 },
};

describe("ScheduleController", () => {
  let controller: ScheduleController;
  let service: jest.Mocked<ScheduleService>;

  const mockReq = {
    user: { sub: MOCK_USER_ID },
    appliedPolicies: MOCK_APPLIED_POLICIES,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [
        {
          provide: ScheduleService,
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

    controller = module.get<ScheduleController>(ScheduleController);
    service = module.get(ScheduleService);
  });

  describe("findAll", () => {
    it("should return schedules list", async () => {
      service.findAll.mockResolvedValue(mockPageable);

      const result = await controller.findAll(mockFilterDto, MOCK_USER_ID, mockReq);

      expect(service.findAll).toHaveBeenCalledWith(mockFilterDto, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result).toEqual(mockPageable);
    });
  });

  describe("findOne", () => {
    it("should return single schedule", async () => {
      service.findOne.mockResolvedValue(mockReadSchedule);

      const result = await controller.findOne(MOCK_SCHEDULE_ID, MOCK_USER_ID, mockReq);

      expect(service.findOne).toHaveBeenCalledWith(MOCK_SCHEDULE_ID, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result).toEqual(mockReadSchedule);
    });
  });

  describe("create", () => {
    it("should create schedule", async () => {
      service.create.mockResolvedValue(mockReadSchedule);

      const result = await controller.create(mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(mockCreateDto);
      expect(result).toEqual(mockReadSchedule);
    });
  });

  describe("update", () => {
    it("should pass update data with security context", async () => {
      const updateData: UpdateScheduleDto = { isOpenManually: true };
      service.update.mockResolvedValue({ ...mockReadSchedule, isOpenManually: true });

      const result = await controller.update(MOCK_SCHEDULE_ID, updateData, MOCK_USER_ID, mockReq);

      expect(service.update).toHaveBeenCalledWith(MOCK_SCHEDULE_ID, updateData, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
      expect(result.isOpenManually).toBe(true);
    });
  });

  describe("delete", () => {
    it("should pass delete request with security context", async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.delete(MOCK_SCHEDULE_ID, MOCK_USER_ID, mockReq);

      expect(service.delete).toHaveBeenCalledWith(MOCK_SCHEDULE_ID, MOCK_USER_ID, MOCK_APPLIED_POLICIES);
    });
  });
});
