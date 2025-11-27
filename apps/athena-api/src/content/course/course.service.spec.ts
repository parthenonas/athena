import { PostgresErrorCode } from "@athena/common";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { CourseService } from "./course.service";
import { CreateCourseDto } from "./dto/create.dto";
import { ReadCourseDto } from "./dto/read.dto";
import { UpdateCourseDto } from "./dto/update.dto";
import { Course } from "./entities/course.entity";

describe("CourseService", () => {
  let service: CourseService;
  let repo: jest.Mocked<Repository<Course>>;

  const mockCourse: Course = {
    id: "course-1",
    title: "Backend Development",
    description: "Learn NestJS + Postgres",
    ownerId: "user-1",
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
    ownerId: "user-1",
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
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
    repo = module.get(getRepositoryToken(Course));
  });

  describe("findAll", () => {
    it("should return paginated courses", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[mockCourse], 1]);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        sortBy: "title",
        sortOrder: "ASC",
        search: "",
      });

      expect(repo.createQueryBuilder).toHaveBeenCalledWith("c");
      expect(qbMock.orderBy).toHaveBeenCalledWith("c.title", "ASC");
      expect(result.meta.total).toBe(1);
      expect(result.data.length).toBe(1);
    });

    it("should apply search filter", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        sortBy: "title",
        sortOrder: "ASC",
        search: "Backend",
      });

      expect(qbMock.andWhere).toHaveBeenCalledWith("c.title ILIKE :q", {
        q: "%Backend%",
      });
    });

    it("should throw BadRequestException if DB fails", async () => {
      qbMock.getManyAndCount.mockRejectedValue(new Error("DB exploded"));

      await expect(
        service.findAll({
          page: 1,
          limit: 10,
          sortBy: "title",
          sortOrder: "ASC",
          search: "",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("findOne", () => {
    it("should return course by id", async () => {
      repo.findOne.mockResolvedValue(mockCourse);

      const result = await service.findOne("course-1");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "course-1" } });
      expect(result).toEqual(mockReadCourse);
    });

    it("should throw NotFoundException if not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nope")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw BadRequestException on DB error", async () => {
      repo.findOne.mockRejectedValue(new Error("query error"));

      await expect(service.findOne("123")).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("create", () => {
    it("should create a course", async () => {
      repo.create.mockReturnValue(mockCourse);
      repo.save.mockResolvedValue(mockCourse);

      const result = await service.create(createDto);

      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(mockReadCourse);
    });

    it("should throw ConflictException on UNIQUE violation", async () => {
      const error: any = new QueryFailedError("duplicate", [], new Error());
      error.code = PostgresErrorCode.UNIQUE_VIOLATION;
      error.constraint = "courses__title__uk";

      repo.save.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
    });

    it("should throw BadRequestException on unknown DB error", async () => {
      repo.save.mockRejectedValue(new Error("unknown"));

      await expect(service.create(createDto)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("update", () => {
    it("should update a course", async () => {
      repo.findOne.mockResolvedValue(mockCourse);

      repo.save.mockResolvedValue({
        ...mockCourse,
        title: updateDto.title!,
        description: updateDto.description!,
        isPublished: updateDto.isPublished!,
      });

      const result = await service.update("course-1", updateDto);

      expect(repo.findOne).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result.title).toBe(updateDto.title);
    });

    it("should throw NotFoundException if course does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update("nope", updateDto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw ConflictException on UNIQUE violation", async () => {
      repo.findOne.mockResolvedValue(mockCourse);

      const error: any = new QueryFailedError("duplicate", [], new Error());
      error.code = PostgresErrorCode.UNIQUE_VIOLATION;
      error.constraint = "courses__title__uk";

      repo.save.mockRejectedValue(error);

      await expect(service.update("course-1", updateDto)).rejects.toBeInstanceOf(ConflictException);
    });

    it("should throw BadRequestException on unknown DB error", async () => {
      repo.findOne.mockResolvedValue(mockCourse);
      repo.save.mockRejectedValue(new Error("unknown"));

      await expect(service.update("x", updateDto)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("softDelete", () => {
    it("should soft delete course", async () => {
      repo.softDelete.mockResolvedValue({ raw: {}, generatedMaps: [], affected: 1 });

      await service.softDelete("course-1");

      expect(repo.softDelete).toHaveBeenCalledWith("course-1");
    });

    it("should throw NotFoundException when affected=0", async () => {
      repo.softDelete.mockResolvedValue({ raw: {}, generatedMaps: [], affected: 0 });

      await expect(service.softDelete("nope")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw BadRequestException on DB error", async () => {
      repo.softDelete.mockRejectedValue(new Error("db error"));

      await expect(service.softDelete("err")).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
