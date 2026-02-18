import { Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { CreateLessonDto } from "./dto/create.dto";
import { FilterLessonDto } from "./dto/filter.dto";
import { UpdateLessonDto } from "./dto/update.dto";
import { Lesson } from "./entities/lesson.entity";
import { LessonService } from "./lesson.service";
import { LessonView } from "./schemas/lesson-view.schema";
import { IdentityService } from "../../identity";
import { OutboxService } from "../../outbox";
import { AthenaEvent } from "../../shared/events/types";
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
  let identityService: jest.Mocked<IdentityService>;
  let outboxService: jest.Mocked<OutboxService>;

  let mockEntityManager: any;
  let mockQueryRunner: any;
  let lessonViewModel: any;

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: mockEntityManager,
    };

    lessonViewModel = {
      findOne: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonService,
        {
          provide: getRepositoryToken(Lesson),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: IdentityService,
          useValue: {
            applyPoliciesToQuery: jest.fn(),
            checkAbility: jest.fn(),
          },
        },
        {
          provide: OutboxService,
          useValue: { save: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner) },
        },
        {
          provide: getModelToken(LessonView.name),
          useValue: lessonViewModel,
        },
      ],
    }).compile();

    service = module.get<LessonService>(LessonService);
    lessonRepo = module.get(getRepositoryToken(Lesson));
    identityService = module.get(IdentityService);
    outboxService = module.get(OutboxService);

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

  describe("findOneView", () => {
    it("should return lesson view if allowed", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(true);
      const viewData = { lessonId: LESSON_ID, title: "Test" };
      lessonViewModel.exec.mockResolvedValue(viewData);

      const result = await service.findOneView(LESSON_ID, USER_ID, [Policy.OWN_ONLY]);

      expect(lessonRepo.findOne).toHaveBeenCalledWith({ where: { id: LESSON_ID }, relations: ["course"] });
      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockCourse);
      expect(lessonViewModel.findOne).toHaveBeenCalledWith({ lessonId: LESSON_ID });
      expect(result).toEqual(viewData);
    });

    it("should throw NotFoundException if view is missing in Mongo", async () => {
      lessonRepo.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(true);
      lessonViewModel.exec.mockResolvedValue(null);

      await expect(service.findOneView(LESSON_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findOneInternal", () => {
    it("should return raw lesson view without ACL", async () => {
      const viewData = { lessonId: LESSON_ID, blocks: [] };
      lessonViewModel.exec.mockResolvedValue(viewData);

      const result = await service.findOneInternal(LESSON_ID);

      expect(lessonViewModel.findOne).toHaveBeenCalledWith({ lessonId: LESSON_ID });
      expect(result).toEqual(viewData);
    });
  });

  describe("create", () => {
    const createDto: CreateLessonDto = {
      courseId: COURSE_ID,
      title: "New Lesson",
    };

    it("should create lesson successfully (Owner) and emit event", async () => {
      mockEntityManager.findOne.mockResolvedValue(mockCourse);
      mockQueryBuilder.getRawOne.mockResolvedValue({ max: 5 });

      mockEntityManager.create.mockReturnValue({ ...mockLesson, order: 6 } as Lesson);
      mockEntityManager.save.mockResolvedValue({ ...mockLesson, order: 6 } as Lesson);

      const result = await service.create(createDto, USER_ID);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Course, { where: { id: COURSE_ID } });
      expect(mockEntityManager.create).toHaveBeenCalledWith(Lesson, expect.objectContaining({ order: 6 }));
      expect(outboxService.save).toHaveBeenCalledWith(
        mockEntityManager,
        AthenaEvent.LESSON_CREATED,
        expect.any(Object),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.order).toBe(6);
    });

    it("should throw NotFoundException if parent course missing", async () => {
      mockEntityManager.findOne.mockResolvedValue(null);
      await expect(service.create(createDto, USER_ID)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user is NOT the course owner", async () => {
      const otherCourse = { ...mockCourse, ownerId: OTHER_USER_ID };
      mockEntityManager.findOne.mockResolvedValue(otherCourse);

      await expect(service.create(createDto, USER_ID)).rejects.toThrow(ForbiddenException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    const updateDto: UpdateLessonDto = { title: "Updated Title" };

    it("should update lesson if allowed and emit event", async () => {
      mockEntityManager.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(true);

      const updatedLesson = { ...mockLesson, title: "Updated Title" };
      mockEntityManager.save.mockResolvedValue(updatedLesson);

      const result = await service.update(LESSON_ID, updateDto, USER_ID, [Policy.OWN_ONLY]);

      expect(mockEntityManager.save).toHaveBeenCalledWith(Lesson, expect.objectContaining({ title: "Updated Title" }));
      expect(outboxService.save).toHaveBeenCalledWith(
        mockEntityManager,
        AthenaEvent.LESSON_UPDATED,
        expect.any(Object),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.title).toBe("Updated Title");
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      mockEntityManager.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.update(LESSON_ID, updateDto, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe("softDelete", () => {
    it("should soft delete if allowed and emit event", async () => {
      mockEntityManager.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(true);
      mockEntityManager.softDelete.mockResolvedValue({ affected: 1 });

      await service.softDelete(LESSON_ID, USER_ID, [Policy.OWN_ONLY]);

      expect(mockEntityManager.softDelete).toHaveBeenCalledWith(Lesson, LESSON_ID);
      expect(outboxService.save).toHaveBeenCalledWith(
        mockEntityManager,
        AthenaEvent.LESSON_DELETED,
        expect.any(Object),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if ACL fails", async () => {
      mockEntityManager.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.softDelete(LESSON_ID, USER_ID, [Policy.OWN_ONLY])).rejects.toThrow(ForbiddenException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("should throw NotFoundException if softDelete affects 0 rows", async () => {
      mockEntityManager.findOne.mockResolvedValue(mockLesson);
      identityService.checkAbility.mockReturnValue(true);
      mockEntityManager.softDelete.mockResolvedValue({ affected: 0 });

      await expect(service.softDelete(LESSON_ID, USER_ID)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
