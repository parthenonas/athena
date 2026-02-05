import { PostgresErrorCode } from "@athena/common";
import { Policy } from "@athena/types";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { CreateInstructorDto } from "./dto/create.dto";
import { UpdateInstructorDto } from "./dto/update.dto";
import { Instructor } from "./entities/instructor.entity";
import { InstructorService } from "./instructor.service";
import { IdentityService } from "../../identity";
import { InstructorView } from "./schemas/instructor-view.schema";

const mockIdentityService = {
  findAccountById: jest.fn(),
  checkAbility: jest.fn(),
  findProfileByOwnerId: jest.fn(),
  applyPoliciesToQuery: jest.fn().mockImplementation(qb => qb),
};

const mockInstructorViewModel = {
  create: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  find: jest.fn(),
};

describe("InstructorService", () => {
  let service: InstructorService;
  let repo: jest.Mocked<Repository<Instructor>>;
  let identityService: typeof mockIdentityService;
  let instructorViewModel: typeof mockInstructorViewModel;

  const USER_ID = "user-1";
  const OTHER_ID = "user-99";
  const INSTRUCTOR_ID = "inst-1";
  const APPLIED_OWN_ONLY = [Policy.OWN_ONLY];
  const APPLIED_NONE: Policy[] = [];

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
        {
          provide: getModelToken(InstructorView.name),
          useValue: mockInstructorViewModel,
        },
      ],
    }).compile();

    service = module.get<InstructorService>(InstructorService);
    repo = module.get(getRepositoryToken(Instructor));
    identityService = module.get(IdentityService);
    instructorViewModel = module.get(getModelToken(InstructorView.name));

    jest.clearAllMocks();
    identityService.checkAbility.mockReturnValue(true);
    identityService.findAccountById.mockResolvedValue({ id: USER_ID });
    identityService.findProfileByOwnerId.mockResolvedValue({
      firstName: "John",
      lastName: "Doe",
      avatarUrl: "http://avatar.com",
    });
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
    it("should create profile and sync to mongo", async () => {
      repo.create.mockReturnValue(mockInstructor);
      repo.save.mockResolvedValue(mockInstructor);
      instructorViewModel.create.mockResolvedValue({} as any);

      const res = await service.create(createDto);

      expect(identityService.findAccountById).toHaveBeenCalledWith(USER_ID);
      expect(repo.save).toHaveBeenCalled();

      expect(identityService.findProfileByOwnerId).toHaveBeenCalledWith(USER_ID);
      expect(instructorViewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          instructorId: INSTRUCTOR_ID,
          ownerId: USER_ID,
          firstName: "John",
        }),
      );

      expect(res.ownerId).toBe(USER_ID);
    });

    it("should throw ConflictException if duplicate", async () => {
      const error = new QueryFailedError("dup", [], new Error());
      (error as any).code = PostgresErrorCode.UNIQUE_VIOLATION;
      (error as any).constraint = "instructors__owner_id__uk";

      repo.save.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
      expect(instructorViewModel.create).not.toHaveBeenCalled();
    });

    it("should rollback postgres if mongo fails", async () => {
      repo.create.mockReturnValue(mockInstructor);
      repo.save.mockResolvedValue(mockInstructor);
      instructorViewModel.create.mockRejectedValue(new Error("Mongo Down"));

      await expect(service.create(createDto)).rejects.toBeInstanceOf(BadRequestException);

      expect(repo.remove).toHaveBeenCalledWith(mockInstructor);
    });
  });

  describe("update", () => {
    it("should update bio and sync to mongo when allowed", async () => {
      repo.findOne.mockResolvedValue(mockInstructor);
      repo.save.mockResolvedValue({ ...mockInstructor, bio: "New" });

      const res = await service.update(INSTRUCTOR_ID, updateDto, USER_ID, APPLIED_OWN_ONLY);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockInstructor);
      expect(repo.save).toHaveBeenCalled();

      expect(instructorViewModel.updateOne).toHaveBeenCalledWith(
        { instructorId: INSTRUCTOR_ID },
        { $set: expect.objectContaining({ bio: "New" }) },
      );

      expect(res.bio).toBe("New");
    });

    it("should throw ForbiddenException if policy denied", async () => {
      repo.findOne.mockResolvedValue(mockInstructor);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.update(INSTRUCTOR_ID, updateDto, OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(instructorViewModel.updateOne).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update("nope", updateDto, USER_ID, APPLIED_NONE)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("delete", () => {
    it("should delete profile when allowed", async () => {
      repo.findOne.mockResolvedValue(mockInstructor);
      repo.remove.mockResolvedValue(mockInstructor);

      await service.delete(INSTRUCTOR_ID, USER_ID, APPLIED_OWN_ONLY);

      expect(identityService.checkAbility).toHaveBeenCalledWith(Policy.OWN_ONLY, USER_ID, mockInstructor);
      expect(repo.remove).toHaveBeenCalled();
      expect(instructorViewModel.deleteOne).toHaveBeenCalledWith({ instructorId: INSTRUCTOR_ID });
    });

    it("should throw ForbiddenException if policy denied", async () => {
      repo.findOne.mockResolvedValue(mockInstructor);
      identityService.checkAbility.mockReturnValue(false);

      await expect(service.delete(INSTRUCTOR_ID, OTHER_ID, APPLIED_OWN_ONLY)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(instructorViewModel.deleteOne).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.delete("nope", USER_ID, APPLIED_NONE)).rejects.toBeInstanceOf(NotFoundException);
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
