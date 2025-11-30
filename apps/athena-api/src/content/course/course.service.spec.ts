import { PostgresErrorCode } from "@athena/common";
import { Policy } from "@athena/types";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { CourseService } from "./course.service";
import { CreateCourseDto } from "./dto/create.dto";
import { ReadCourseDto } from "./dto/read.dto";
import { UpdateCourseDto } from "./dto/update.dto";
import { Course } from "./entities/course.entity";
import { IdentityService } from "../../identity";
import { ReadAccountDto } from "../../identity/account/dto/read.dto";

const mockIdentityService = {
  findAccountById: jest.fn(),
  checkAbility: jest.fn(),
  applyPoliciesToQuery: jest.fn().mockImplementation(qb => qb),
};

describe("CourseService", () => {
  let service: CourseService;
  let repo: jest.Mocked<Repository<Course>>;
  let identityService: typeof mockIdentityService;

  const USER_ID = "user-1";
  const OTHER_ID = "user-99";

  const APPLIED_OWN_ONLY = [Policy.OWN_ONLY];
  const APPLIED_NONE: Policy[] = [];

  const mockCourse: Course = {
    id: "course-1",
    title: "Backend Development",
    description: "Learn NestJS + Postgres",
    ownerId: USER_ID,
    tags: ["backend", "nestjs"],
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    lessons: [],
  };

  const mockReadCourse: ReadCourseDto = {
    id: mockCourse.id,
    title: mockCourse.title,
    description: mockCourse.description,
    ownerId: mockCourse.ownerId,
    tags: mockCourse.tags,
    isPublished: mockCourse.isPublished,
    createdAt: mockCourse.createdAt,
    updatedAt: mockCourse.updatedAt,
  };

  const createDto: CreateCourseDto = {
    title: "Backend Development",
    description: "Learn NestJS + Postgres",
    tags: ["backend"],
    isPublished: false,
  };

  const updateDto: UpdateCourseDto = {
    title: "Updated Title",
    description: "Updated Desc",
    isPublished: true,
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
        CourseService,
        {
          provide: getRepositoryToken(Course),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(qbMock),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: IdentityService,
          useValue: mockIdentityService,
        },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
    repo = module.get(getRepositoryToken(Course));
    identityService = module.get(IdentityService);

    jest.clearAllMocks();
    identityService.findAccountById.mockResolvedValue({ id: USER_ID } as ReadAccountDto);
    identityService.checkAbility.mockReturnValue(true);
    identityService.applyPoliciesToQuery.mockImplementation(qb => qb);
  });

  describe("findAll", () => {
    it("should return paginated courses and apply policy filters", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[mockCourse], 1]);
      identityService.applyPoliciesToQuery.mockImplementation(qb => qb);

      const result = await service.findAll(
        {
          page: 1,
          limit: 20,
          sortBy: "title",
          sortOrder: "ASC",
          search: "",
        },
        USER_ID,
        APPLIED_OWN_ONLY,
      );

      expect(repo.createQueryBuilder).toHaveBeenCalledWith("c");
      expect(identityService.applyPoliciesToQuery).toHaveBeenCalledWith(expect.anything(), USER_ID, APPLIED_OWN_ONLY);
      expect(result.meta.total).toBe(1);
    });

    it("should apply search filter", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        {
          page: 1,
          limit: 20,
          sortBy: "title",
          sortOrder: "ASC",
          search: "Backend",
        },
        USER_ID,
        APPLIED_NONE,
      );

      expect(qbMock.andWhere).toHaveBeenCalledWith("c.title ILIKE :q", {
        q: "%Backend%",
      });
    });

    it("should throw BadRequestException if DB fails", async () => {
      qbMock.getManyAndCount.mockRejectedValue(new Error("DB exploded"));

      await expect(
        service.findAll(
          {
            page: 1,
            limit: 10,
            sortBy: "title",
            sortOrder: "ASC",
            search: "",
          },
          USER_ID,
          APPLIED_NONE,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("findOne", () => {
    it("should return course by id", async () => {
      repo.findOne.mockResolvedValue(mockCourse);

      const result = await service.findOne("course-1", USER_ID, APPLIED_NONE);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "course-1" } });
      expect(result).toEqual(mockReadCourse);
    });

    it("should throw ForbiddenException if policy check fails", async () => {
      repo.findOne.mockResolvedValue(mockCourse);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.findOne("course-1", OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("should throw NotFoundException if not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nope", USER_ID, APPLIED_NONE)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("create", () => {
    it("should create a course with ownerId from token", async () => {
      repo.create.mockReturnValue(mockCourse);
      repo.save.mockResolvedValue(mockCourse);

      const result = await service.create(createDto, USER_ID);

      expect(identityService.findAccountById).toHaveBeenCalledWith(USER_ID);
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(mockReadCourse);
    });

    it("should throw NotFoundException if ownerId account does not exist", async () => {
      identityService.findAccountById.mockRejectedValue(new NotFoundException());

      await expect(service.create(createDto, OTHER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw ConflictException on UNIQUE violation", async () => {
      const error: any = new QueryFailedError("duplicate", [], new Error());
      error.code = PostgresErrorCode.UNIQUE_VIOLATION;
      error.constraint = "courses__title__uk";

      repo.save.mockRejectedValue(error);

      await expect(service.create(createDto, USER_ID)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("update", () => {
    it("should update a course when policy allows", async () => {
      repo.findOne.mockResolvedValue(mockCourse);

      repo.save.mockResolvedValue({
        ...mockCourse,
        title: updateDto.title!,
        description: updateDto.description!,
        isPublished: updateDto.isPublished!,
      });

      const result = await service.update("course-1", updateDto, USER_ID, APPLIED_OWN_ONLY);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockCourse);
      expect(repo.save).toHaveBeenCalled();
      expect(result.title).toBe(updateDto.title);
    });

    it("should throw ForbiddenException if policy check fails", async () => {
      repo.findOne.mockResolvedValue(mockCourse);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.update("course-1", updateDto, OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException if course does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update("nope", updateDto, USER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("should throw ConflictException on UNIQUE violation", async () => {
      repo.findOne.mockResolvedValue(mockCourse);

      const error: any = new QueryFailedError("duplicate", [], new Error());
      error.code = PostgresErrorCode.UNIQUE_VIOLATION;
      error.constraint = "courses__title__uk";

      repo.save.mockRejectedValue(error);

      await expect(service.update("course-1", updateDto, USER_ID, APPLIED_NONE)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe("softDelete", () => {
    it("should soft delete course when policy allows", async () => {
      repo.findOne.mockResolvedValue(mockCourse);
      repo.softDelete.mockResolvedValue({ raw: {}, generatedMaps: [], affected: 1 });

      await service.softDelete("course-1", USER_ID, APPLIED_OWN_ONLY);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockCourse);
      expect(repo.softDelete).toHaveBeenCalledWith("course-1");
    });

    it("should throw ForbiddenException if policy check fails", async () => {
      repo.findOne.mockResolvedValue(mockCourse);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.softDelete("course-1", OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException when affected=0", async () => {
      repo.findOne.mockResolvedValue(mockCourse);
      repo.softDelete.mockResolvedValue({ raw: {}, generatedMaps: [], affected: 0 });

      await expect(service.softDelete("nope", USER_ID, APPLIED_NONE)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
