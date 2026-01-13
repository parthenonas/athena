import { PostgresErrorCode } from "@athena/common";
import { Policy } from "@athena/types";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { CreateScheduleDto } from "./dto/create.dto";
import { UpdateScheduleDto } from "./dto/update.dto";
import { Schedule } from "./entities/schedule.entity";
import { ScheduleService } from "./schedule.service";
import { IdentityService } from "../../identity";

const mockIdentityService = {
  checkAbility: jest.fn(),
  applyPoliciesToQuery: jest.fn().mockImplementation(qb => qb),
};

describe("ScheduleService", () => {
  let service: ScheduleService;
  let repo: jest.Mocked<Repository<Schedule>>;
  let identityService: typeof mockIdentityService;

  const USER_ID = "user-1";
  const OTHER_ID = "user-99";
  const COHORT_ID = "cohort-1";
  const SCHEDULE_ID = "schedule-1";
  const LESSON_ID = "lesson-1";

  const APPLIED_OWN_ONLY = [Policy.OWN_ONLY];
  const APPLIED_NONE: Policy[] = [];

  const mockSchedule: Schedule = {
    id: SCHEDULE_ID,
    cohortId: COHORT_ID,
    lessonId: LESSON_ID,
    startAt: new Date(),
    endAt: null,
    isOpenManually: false,
    configOverrides: { "block-1": "view" } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    cohort: {
      id: COHORT_ID,
      ownerId: USER_ID,
      instructor: { ownerId: USER_ID } as any,
    } as any,
  };

  const createDto: CreateScheduleDto = {
    cohortId: COHORT_ID,
    lessonId: LESSON_ID,
    isOpenManually: false,
  };

  const updateDto: UpdateScheduleDto = {
    isOpenManually: true,
  };

  const createQueryBuilderMock = () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };
    return qb;
  };

  let qbMock: ReturnType<typeof createQueryBuilderMock>;

  beforeEach(async () => {
    qbMock = createQueryBuilderMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(qbMock),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: IdentityService,
          useValue: mockIdentityService,
        },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    repo = module.get(getRepositoryToken(Schedule));
    identityService = module.get(IdentityService);

    jest.clearAllMocks();
    identityService.checkAbility.mockReturnValue(true);
  });

  describe("findAll", () => {
    it("should return schedules and join entities", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[mockSchedule], 1]);

      await service.findAll({ page: 1, limit: 10, sortBy: "startAt", sortOrder: "DESC" }, USER_ID, APPLIED_OWN_ONLY);

      expect(qbMock.leftJoinAndSelect).toHaveBeenCalledWith("s.cohort", "c");
      expect(qbMock.leftJoinAndSelect).toHaveBeenCalledWith("c.instructor", "i");
      expect(identityService.applyPoliciesToQuery).toHaveBeenCalledWith(
        expect.anything(),
        USER_ID,
        APPLIED_OWN_ONLY,
        "i",
      );
    });
  });

  describe("findOne", () => {
    it("should return schedule and check policies", async () => {
      repo.findOne.mockResolvedValue(mockSchedule);

      const result = await service.findOne(SCHEDULE_ID, USER_ID, APPLIED_OWN_ONLY);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: SCHEDULE_ID },
        relations: ["cohort", "cohort.instructor"],
      });
      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockSchedule.cohort);
      expect(result.id).toBe(SCHEDULE_ID);
    });

    it("should throw ForbiddenException if denied", async () => {
      repo.findOne.mockResolvedValue(mockSchedule);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.findOne(SCHEDULE_ID, OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("create", () => {
    it("should create schedule", async () => {
      repo.create.mockReturnValue(mockSchedule);
      repo.save.mockResolvedValue(mockSchedule);

      await service.create(createDto);
      expect(repo.save).toHaveBeenCalled();
    });

    it("should throw ConflictException on duplicate", async () => {
      const error = new QueryFailedError("dup", [], new Error());
      (error as any).code = PostgresErrorCode.UNIQUE_VIOLATION;
      (error as any).constraint = "schedules__cohort_lesson__uk";

      repo.save.mockRejectedValue(error);
      await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("update", () => {
    it("should update schedule if allowed", async () => {
      repo.findOne.mockResolvedValue(mockSchedule);
      repo.save.mockResolvedValue({ ...mockSchedule, isOpenManually: true });

      const res = await service.update(SCHEDULE_ID, updateDto, USER_ID, APPLIED_OWN_ONLY);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockSchedule.cohort);
      expect(res.isOpenManually).toBe(true);
    });

    it("should throw ForbiddenException if policy denied", async () => {
      repo.findOne.mockResolvedValue(mockSchedule);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.update(SCHEDULE_ID, updateDto, OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException if not found", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update("nope", updateDto, USER_ID, APPLIED_NONE)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("delete", () => {
    it("should delete schedule if allowed", async () => {
      repo.findOne.mockResolvedValue(mockSchedule);
      repo.remove.mockResolvedValue(mockSchedule);

      await service.delete(SCHEDULE_ID, USER_ID, APPLIED_OWN_ONLY);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockSchedule.cohort);
      expect(repo.remove).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if policy denied", async () => {
      repo.findOne.mockResolvedValue(mockSchedule);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.delete(SCHEDULE_ID, OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
