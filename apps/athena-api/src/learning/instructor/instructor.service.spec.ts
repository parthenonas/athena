import { PostgresErrorCode } from "@athena/common";
import { Policy } from "@athena/types";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { CreateInstructorDto } from "./dto/create.dto";
import { UpdateInstructorDto } from "./dto/update.dto";
import { Instructor } from "./entities/instructor.entity";
import { InstructorService } from "./instructor.service";
import { IdentityService } from "../../identity";

const mockIdentityService = {
  findAccountById: jest.fn(),
  checkAbility: jest.fn(),
  applyPoliciesToQuery: jest.fn().mockImplementation(qb => qb),
};

describe("InstructorService", () => {
  let service: InstructorService;
  let repo: jest.Mocked<Repository<Instructor>>;
  let identityService: typeof mockIdentityService;

  const USER_ID = "user-1";
  const INSTRUCTOR_ID = "inst-1";
  const APPLIED_OWN_ONLY = [Policy.OWN_ONLY];

  const mockInstructor: Instructor = {
    id: INSTRUCTOR_ID,
    ownerId: USER_ID,
    bio: "Bio",
    title: "PhD",
    cohorts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createDto: CreateInstructorDto = {
    ownerId: USER_ID,
    bio: "Bio",
    title: "PhD",
  };

  const updateDto: UpdateInstructorDto = {
    bio: "Updated Bio",
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
        InstructorService,
        {
          provide: getRepositoryToken(Instructor),
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

    service = module.get<InstructorService>(InstructorService);
    repo = module.get(getRepositoryToken(Instructor));
    identityService = module.get(IdentityService);

    jest.clearAllMocks();
    identityService.checkAbility.mockReturnValue(true);
    identityService.findAccountById.mockResolvedValue({ id: USER_ID });
  });

  describe("findAll", () => {
    it("should return instructors", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[mockInstructor], 1]);

      const result = await service.findAll(
        { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "DESC" },
        USER_ID,
        APPLIED_OWN_ONLY,
      );

      expect(identityService.applyPoliciesToQuery).toHaveBeenCalledWith(
        expect.anything(),
        USER_ID,
        APPLIED_OWN_ONLY,
        "i",
      );
      expect(result.data[0].id).toBe(INSTRUCTOR_ID);
    });

    it("should filter by search", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, limit: 10, sortBy: "createdAt", sortOrder: "DESC", search: "PhD" }, USER_ID);
      expect(qbMock.andWhere).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create profile", async () => {
      repo.create.mockReturnValue(mockInstructor);
      repo.save.mockResolvedValue(mockInstructor);

      const res = await service.create(createDto);

      expect(identityService.findAccountById).toHaveBeenCalledWith(USER_ID);
      expect(res.ownerId).toBe(USER_ID);
    });

    it("should throw ConflictException if duplicate", async () => {
      const error: any = new QueryFailedError("dup", [], new Error());
      error.code = PostgresErrorCode.UNIQUE_VIOLATION;
      error.constraint = "instructors__owner_id__uk";

      repo.save.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("update", () => {
    it("should update bio", async () => {
      repo.findOne.mockResolvedValue(mockInstructor);
      repo.save.mockResolvedValue({ ...mockInstructor, bio: "New" });

      const res = await service.update(INSTRUCTOR_ID, updateDto);
      expect(res.bio).toBe("New");
    });
  });

  describe("findOne", () => {
    it("should check access", async () => {
      repo.findOne.mockResolvedValue(mockInstructor);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.findOne(INSTRUCTOR_ID, "other", APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
