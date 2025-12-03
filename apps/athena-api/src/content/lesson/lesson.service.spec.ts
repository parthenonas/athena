import { Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CreateLessonDto } from "./dto/create.dto";
import { FilterLessonDto } from "./dto/filter.dto";
import { UpdateLessonDto } from "./dto/update.dto";
import { Lesson } from "./entities/lesson.entity";
import { LessonService } from "./lesson.service";
import { IdentityService } from "../../identity";
import { Course } from "../course/entities/course.entity";

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const COURSE_ID = "course-1";
const LESSON_ID = "lesson-1";

const mockCourse = {
  id: COURSE_ID,
  title: "Test Course",
  ownerId: USER_ID,
} as Course;

const mockLesson = {
  id: LESSON_ID,
  title: "Test Lesson",
  courseId: COURSE_ID,
  course: mockCourse,
  order: 1,
  isDraft: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Lesson;

const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getRawOne: jest.fn(),
};

describe("LessonService", () => {
  let service: LessonService;
  let lessonRepo: jest.Mocked<Repository<Lesson>>;
  let courseRepo: jest.Mocked<Repository<Course>>;
  let identityService: jest.Mocked<IdentityService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonService,
        {
          provide: getRepositoryToken(Lesson),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Course),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: IdentityService,
          useValue: {
            applyPoliciesToQuery: jest.fn(),
            checkAbility: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LessonService>(LessonService);
    lessonRepo = module.get(getRepositoryToken(Lesson));
    courseRepo = module.get(getRepositoryToken(Course));
    identityService = module.get(IdentityService);

    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated lessons with correct filters and ACL applied", async () => {
      const filters: FilterLessonDto = {
        courseId: COURSE_ID,
        page: 1,
        limit: 10,
        search: "Intro",
        sortBy: "order",
        sortOrder: "ASC",
      };
      const policies = [Policy.OWN_ONLY];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockLesson], 1]);

      const result = await service.findAll(filters, USER_ID, policies);

      expect(lessonRepo.createQueryBuilder).toHaveBeenCalledWith("l");

      expect(identityService.applyPoliciesToQuery).toHaveBeenCalledWith(expect.anything(), USER_ID, policies, "c");

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("l.courseId = :courseId", { courseId: COURSE_ID });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("l.title ILIKE :q", { q: "%Intro%" });

      expect(result.data[0].id).toBe(LESSON_ID);
      expect(result.meta.total).toBe(1);
    });

    it("should throw BadRequestException on DB error", async () => {
      mockQueryBuilder.getManyAndCount.mockRejectedValue(new Error("DB Boom"));
      await expect(service.findAll({} as any, USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe("findOne", () => {
    it("should return lesson if found and allowed", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(true);

      const result = await service.findOne(LESSON_ID, USER_ID, [Policy.OWN_ONLY]);

      expect(lessonRepo.findOne).toHaveBeenCalledWith({
        where: { id: LESSON_ID },
        relations: ["course"],
      });
      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockCourse);
      expect(result.id).toBe(LESSON_ID);
    });

    it("should throw NotFoundException if lesson does not exist", async () => {
      lessonRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne("bad-id", USER_ID)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if ACL check fails", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.findOne(LESSON_ID, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(ForbiddenException);
    });
  });

  describe("create", () => {
    const createDto: CreateLessonDto = {
      courseId: COURSE_ID,
      title: "New Lesson",
    };

    it("should create lesson successfully (Owner)", async () => {
      courseRepo.findOne.mockResolvedValue(mockCourse);

      mockQueryBuilder.getRawOne.mockResolvedValue({ max: 5 });

      lessonRepo.create.mockReturnValue({ ...mockLesson, order: 6 } as Lesson);
      lessonRepo.save.mockResolvedValue({ ...mockLesson, order: 6 } as Lesson);

      const result = await service.create(createDto, USER_ID);

      expect(courseRepo.findOne).toHaveBeenCalledWith({ where: { id: COURSE_ID } });
      expect(lessonRepo.create).toHaveBeenCalledWith(expect.objectContaining({ order: 6 }));
      expect(result.order).toBe(6);
    });

    it("should throw NotFoundException if parent course missing", async () => {
      courseRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if user is NOT the course owner", async () => {
      const otherCourse = { ...mockCourse, ownerId: OTHER_USER_ID };
      courseRepo.findOne.mockResolvedValue(otherCourse);

      await expect(service.create(createDto, USER_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("update", () => {
    const updateDto: UpdateLessonDto = { title: "Updated Title" };

    it("should update lesson if allowed", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(true);

      const updatedLesson = { ...mockLesson, title: "Updated Title" };
      lessonRepo.save.mockResolvedValue(updatedLesson);

      const result = await service.update(LESSON_ID, updateDto, USER_ID, [Policy.OWN_ONLY]);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockCourse);

      expect(lessonRepo.save).toHaveBeenCalledWith(expect.objectContaining({ title: "Updated Title" }));
      expect(result.title).toBe("Updated Title");
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.update(LESSON_ID, updateDto, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("softDelete", () => {
    it("should soft delete if allowed", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(true);
      lessonRepo.softDelete.mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });

      await service.softDelete(LESSON_ID, USER_ID, [Policy.OWN_ONLY]);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockCourse);
      expect(lessonRepo.softDelete).toHaveBeenCalledWith(LESSON_ID);
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.softDelete(LESSON_ID, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException if softDelete affects 0 rows", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(true);
      lessonRepo.softDelete.mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] });

      await expect(service.softDelete(LESSON_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
