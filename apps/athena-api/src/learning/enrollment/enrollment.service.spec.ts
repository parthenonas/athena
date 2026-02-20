import { EnrollmentStatus, Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { CreateEnrollmentDto } from "./dto/create.dto";
import { UpdateEnrollmentDto } from "./dto/update.dto";
import { EnrollmentService } from "./enrollment.service";
import { Enrollment } from "./entities/enrollment.entity";
import { IdentityService } from "../../identity";
import { OutboxService } from "../../outbox";
import { AthenaEvent } from "../../shared/events/types";

const mockIdentityService = {
  checkAbility: jest.fn(),
  applyPoliciesToQuery: jest.fn().mockImplementation(qb => qb),
};

const mockOutboxService = {
  save: jest.fn(),
};

const mockManager = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: mockManager,
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

describe("EnrollmentService", () => {
  let service: EnrollmentService;
  let repo: jest.Mocked<Repository<Enrollment>>;
  let identityService: typeof mockIdentityService;

  const USER_ID = "user-1";
  const OTHER_ID = "user-99";
  const COHORT_ID = "cohort-1";
  const ENROLLMENT_ID = "enrollment-1";

  const APPLIED_OWN_ONLY = [Policy.OWN_ONLY];
  const APPLIED_NONE: Policy[] = [];

  const mockEnrollment: Enrollment = {
    id: ENROLLMENT_ID,
    cohortId: COHORT_ID,
    ownerId: USER_ID,
    cohort: {} as any,
    status: EnrollmentStatus.Active,
    enrolledAt: new Date(),
  };

  const createDto: CreateEnrollmentDto = {
    cohortId: COHORT_ID,
    ownerId: USER_ID,
  };

  const updateDto: UpdateEnrollmentDto = {
    status: EnrollmentStatus.Expelled,
  };

  const createQueryBuilderMock = () => {
    const qb: any = {
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
        EnrollmentService,
        {
          provide: getRepositoryToken(Enrollment),
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
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: OutboxService,
          useValue: mockOutboxService,
        },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);
    repo = module.get(getRepositoryToken(Enrollment));
    identityService = module.get(IdentityService);

    jest.clearAllMocks();
    identityService.checkAbility.mockReturnValue(true);
    identityService.applyPoliciesToQuery.mockImplementation(qb => qb);
  });

  describe("findAll", () => {
    it("should return enrollments and check policies", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[mockEnrollment], 1]);

      const result = await service.findAll(
        { page: 1, limit: 10, sortBy: "enrolledAt", sortOrder: "DESC" },
        USER_ID,
        APPLIED_OWN_ONLY,
      );

      expect(identityService.applyPoliciesToQuery).toHaveBeenCalledWith(
        expect.anything(),
        USER_ID,
        APPLIED_OWN_ONLY,
        "e",
      );
      expect(result.data[0].ownerId).toBe(USER_ID);
    });

    it("should throw BadRequestException on DB error", async () => {
      qbMock.getManyAndCount.mockRejectedValue(new Error("DB error"));
      await expect(
        service.findAll({ page: 1, limit: 10, sortBy: "enrolledAt", sortOrder: "DESC" }, USER_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("findOne", () => {
    it("should return enrollment", async () => {
      repo.findOne.mockResolvedValue(mockEnrollment);
      const result = await service.findOne(ENROLLMENT_ID, USER_ID, []);
      expect(result.id).toBe(ENROLLMENT_ID);
    });

    it("should throw ForbiddenException if policy denied", async () => {
      repo.findOne.mockResolvedValue(mockEnrollment);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.findOne(ENROLLMENT_ID, OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne("nope", USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("create", () => {
    it("should map accountId to ownerId correctly", async () => {
      mockManager.findOne.mockResolvedValue({ id: COHORT_ID, courseId: "course-123" });

      mockManager.create.mockReturnValue(mockEnrollment);
      mockManager.save.mockResolvedValue(mockEnrollment);

      mockOutboxService.save.mockResolvedValue(true);

      await service.create(createDto);

      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ownerId: createDto.ownerId,
        }),
      );
    });

    it("should throw BadRequestException on error", async () => {
      mockManager.findOne.mockResolvedValue({ id: COHORT_ID, courseId: "course-123" });

      mockManager.save.mockRejectedValue(new Error("Database Fail"));

      await expect(service.create(createDto)).rejects.toBeInstanceOf(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update status when access allowed", async () => {
      repo.findOne.mockResolvedValue(mockEnrollment);
      repo.save.mockResolvedValue({ ...mockEnrollment, status: EnrollmentStatus.Expelled });

      const res = await service.update(ENROLLMENT_ID, updateDto, USER_ID, APPLIED_OWN_ONLY);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockEnrollment);
      expect(repo.save).toHaveBeenCalled();
      expect(res.status).toBe(EnrollmentStatus.Expelled);
    });

    it("should throw ForbiddenException if access denied", async () => {
      repo.findOne.mockResolvedValue(mockEnrollment);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.update(ENROLLMENT_ID, updateDto, OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update("nope", updateDto, USER_ID, APPLIED_NONE)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("delete", () => {
    it("should delete enrollment when access allowed and emit event", async () => {
      const mockEnrollmentData = {
        id: "enroll-1",
        ownerId: "user-1",
        cohortId: "cohort-1",
        cohort: { courseId: "course-1" },
      };

      repo.findOne.mockResolvedValue(mockEnrollmentData as any);
      identityService.checkAbility.mockReturnValue(true);

      await service.delete("enroll-1", "user-1", [Policy.OWN_ONLY]);

      expect(mockManager.remove).toHaveBeenCalledWith(Enrollment, mockEnrollmentData);

      expect(mockOutboxService.save).toHaveBeenCalledWith(mockManager, AthenaEvent.ENROLLMENT_DELETED, {
        id: "enroll-1",
        userId: "user-1",
        cohortId: "cohort-1",
        courseId: "course-1",
      });

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      repo.findOne.mockResolvedValue({ id: "enroll-1", cohort: {} } as any);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.delete("enroll-1", "user-1", [Policy.OWN_ONLY])).rejects.toThrow(ForbiddenException);
    });
  });
});
