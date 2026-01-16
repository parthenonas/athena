import { Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CohortService } from "./cohort.service";
import { CreateCohortDto } from "./dto/create.dto";
import { ReadCohortDto } from "./dto/read.dto";
import { UpdateCohortDto } from "./dto/update.dto";
import { Cohort } from "./entities/cohort.entity";
import { IdentityService } from "../../identity";

const mockIdentityService = {
  findAccountById: jest.fn(),
  checkAbility: jest.fn(),
  applyPoliciesToQuery: jest.fn().mockImplementation(qb => qb),
};

describe("CohortService", () => {
  let service: CohortService;
  let repo: jest.Mocked<Repository<Cohort>>;
  let identityService: typeof mockIdentityService;

  const USER_ID = "user-1";
  const OTHER_ID = "user-99";
  const INSTRUCTOR_ID = "instructor-uuid";

  const APPLIED_OWN_ONLY = [Policy.OWN_ONLY];
  const APPLIED_NONE: Policy[] = [];

  const mockCohort: Cohort = {
    id: "cohort-1",
    name: "CS-2024-A",
    courseId: "course-1",
    instructorId: INSTRUCTOR_ID,
    instructor: {
      id: INSTRUCTOR_ID,
      ownerId: USER_ID,
      accountId: USER_ID,
      bio: null,
      title: null,
      cohorts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any,
    startDate: new Date(),
    endDate: null,
    enrollments: [],
    schedules: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: USER_ID,
  };

  const mockReadCohort: ReadCohortDto = {
    id: mockCohort.id,
    courseId: "course-1",
    name: mockCohort.name,
    instructorId: mockCohort.instructorId,
    startDate: mockCohort.startDate,
    endDate: mockCohort.endDate,
    createdAt: mockCohort.createdAt,
    updatedAt: mockCohort.updatedAt,
  };

  const createDto: CreateCohortDto = {
    name: "CS-2024-A",
    courseId: "course-1",
    instructorId: INSTRUCTOR_ID,
    startDate: new Date(),
  };

  const updateDto: UpdateCohortDto = {
    name: "Updated Name",
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
        CohortService,
        {
          provide: getRepositoryToken(Cohort),
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

    service = module.get<CohortService>(CohortService);
    repo = module.get(getRepositoryToken(Cohort));
    identityService = module.get(IdentityService);

    jest.clearAllMocks();
    identityService.checkAbility.mockReturnValue(true);
    identityService.applyPoliciesToQuery.mockImplementation(qb => qb);
  });

  describe("findAll", () => {
    it("should return paginated cohorts and apply ability policies", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[mockCohort], 1]);

      const result = await service.findAll(
        {
          page: 1,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "DESC",
          search: "",
        },
        USER_ID,
        APPLIED_OWN_ONLY,
      );

      expect(repo.createQueryBuilder).toHaveBeenCalledWith("c");
      expect(qbMock.leftJoinAndSelect).toHaveBeenCalledWith("c.instructor", "i");

      expect(identityService.applyPoliciesToQuery).toHaveBeenCalledWith(
        expect.anything(),
        USER_ID,
        APPLIED_OWN_ONLY,
        "i",
      );

      expect(result.meta.total).toBe(1);
      expect(result.data[0].id).toBe(mockCohort.id);
    });

    it("should apply filters correctly", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        {
          page: 1,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "DESC",
          search: "CS-2024",
          instructorId: INSTRUCTOR_ID,
        },
        USER_ID,
        APPLIED_NONE,
      );

      expect(qbMock.andWhere).toHaveBeenCalledWith("c.name ILIKE :q", {
        q: "%CS-2024%",
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith("c.instructorId = :iId", {
        iId: INSTRUCTOR_ID,
      });
    });

    it("should throw BadRequestException on DB error", async () => {
      qbMock.getManyAndCount.mockRejectedValue(new Error("DB exploded"));

      await expect(
        service.findAll({ page: 1, limit: 10, sortBy: "createdAt", sortOrder: "DESC" }, USER_ID, APPLIED_NONE),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("findOne", () => {
    it("should return cohort by id", async () => {
      repo.findOne.mockResolvedValue(mockCohort);

      const result = await service.findOne("cohort-1", USER_ID, APPLIED_NONE);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "cohort-1" },
        relations: ["instructor"],
      });
      expect(result).toEqual(mockReadCohort);
    });

    it("should check policies via AbilityService", async () => {
      repo.findOne.mockResolvedValue(mockCohort);

      await service.findOne("cohort-1", USER_ID, APPLIED_OWN_ONLY);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockCohort);
    });

    it("should throw ForbiddenException if policy check fails", async () => {
      repo.findOne.mockResolvedValue(mockCohort);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.findOne("cohort-1", OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("should throw NotFoundException if not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nope", USER_ID, APPLIED_NONE)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("create", () => {
    it("should create a cohort", async () => {
      repo.create.mockReturnValue(mockCohort);
      repo.save.mockResolvedValue(mockCohort);

      const result = await service.create(createDto);

      expect(repo.create).toHaveBeenCalledWith({
        name: createDto.name,
        courseId: "course-1",
        instructorId: createDto.instructorId,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(mockReadCohort);
    });

    it("should throw BadRequestException on error", async () => {
      repo.save.mockRejectedValue(new Error("Error"));
      await expect(service.create(createDto)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("update", () => {
    it("should update a cohort when access allowed", async () => {
      repo.findOne.mockResolvedValue(mockCohort);
      repo.save.mockResolvedValue({ ...mockCohort, name: updateDto.name! } as any);

      const result = await service.update("cohort-1", updateDto, USER_ID, APPLIED_OWN_ONLY);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockCohort);
      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
    });

    it("should throw ForbiddenException if policy denied", async () => {
      repo.findOne.mockResolvedValue(mockCohort);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.update("cohort-1", updateDto, OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException if cohort does not exist", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update("nope", updateDto, USER_ID, APPLIED_NONE)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("delete", () => {
    it("should delete cohort when access allowed", async () => {
      repo.findOne.mockResolvedValue(mockCohort);
      repo.remove.mockResolvedValue(mockCohort);

      await service.delete("cohort-1", USER_ID, APPLIED_OWN_ONLY);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockCohort);
      expect(repo.remove).toHaveBeenCalledWith(mockCohort);
    });

    it("should throw ForbiddenException if policy denied", async () => {
      repo.findOne.mockResolvedValue(mockCohort);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.delete("cohort-1", OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("should throw NotFoundException if not found", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.delete("nope", USER_ID, APPLIED_NONE)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
