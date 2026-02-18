import { Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { v4 as uuid } from "uuid";

import { CreateProfileDto } from "./dto/create.dto";
import { UpdateProfileDto } from "./dto/update.dto";
import { Profile } from "./entities/profile.entity";
import { ProfileService } from "./profile.service";
import { OutboxService } from "../../outbox";
import { AbilityService } from "../acl/ability.service";

describe("ProfileService", () => {
  let service: ProfileService;
  let abilityService: AbilityService;

  const mockOwnerId = uuid();
  const mockProfileId = uuid();

  const mockProfile = {
    id: mockProfileId,
    ownerId: mockOwnerId,
    firstName: "Ivan",
    lastName: "Ivanov",
    metadata: {},
  } as Profile;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };

  const mockAbilityService = {
    check: jest.fn(),
  };

  const mockOutboxService = {
    save: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: getRepositoryToken(Profile),
          useValue: mockRepo,
        },
        {
          provide: AbilityService,
          useValue: mockAbilityService,
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

    service = module.get<ProfileService>(ProfileService);
    abilityService = module.get<AbilityService>(AbilityService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    const createDto: CreateProfileDto = {
      firstName: "Ivan",
      lastName: "Ivanov",
    };

    it("should create profile if not exists", async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.create.mockReturnValue(mockProfile);
      mockQueryRunner.manager.save.mockResolvedValue(mockProfile);

      const result = await service.create(mockOwnerId, createDto);

      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(Profile, { where: { ownerId: mockOwnerId } });
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(Profile, { ...createDto, ownerId: mockOwnerId });
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();

      expect(mockOutboxService.save).toHaveBeenCalled();

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      expect(result).toEqual(mockProfile);
    });

    it("should throw BadRequest if profile already exists", async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockProfile);

      await expect(service.create(mockOwnerId, createDto)).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.manager.create).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe("findByOwnerId", () => {
    it("should return profile if found and policy allows", async () => {
      mockRepo.findOne.mockResolvedValue(mockProfile);
      mockAbilityService.check.mockReturnValue(true);

      const result = await service.findByOwnerId(mockOwnerId, mockOwnerId, [Policy.OWN_ONLY]);

      expect(abilityService.check).toHaveBeenCalledWith(Policy.OWN_ONLY, mockOwnerId, mockProfile);
      expect(result).toEqual(mockProfile);
    });

    it("should throw ForbiddenException if policy check fails", async () => {
      mockRepo.findOne.mockResolvedValue(mockProfile);
      mockAbilityService.check.mockReturnValue(false);

      const strangerId = uuid();
      await expect(service.findByOwnerId(mockOwnerId, strangerId, [Policy.OWN_ONLY])).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw NotFound if not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findByOwnerId(mockOwnerId, mockOwnerId)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    const updateDto: UpdateProfileDto = { firstName: "Petr" };

    it("should update profile fields if found and policy allows", async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockProfile);
      mockAbilityService.check.mockReturnValue(true);
      mockQueryRunner.manager.merge.mockImplementation((entity, dto) => Object.assign(entity, dto));
      mockQueryRunner.manager.save.mockResolvedValue({ ...mockProfile, firstName: "Petr" });

      const result = await service.update(mockOwnerId, updateDto, mockOwnerId, [Policy.OWN_ONLY]);

      expect(abilityService.check).toHaveBeenCalledWith(Policy.OWN_ONLY, mockOwnerId, mockProfile);
      expect(mockQueryRunner.manager.merge).toHaveBeenCalledWith(Profile, mockProfile, updateDto);

      expect(mockOutboxService.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();

      expect(result.firstName).toBe("Petr");
    });

    it("should throw ForbiddenException if policy check fails", async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockProfile);
      mockAbilityService.check.mockReturnValue(false);

      await expect(service.update(mockOwnerId, updateDto, "stranger-id", [Policy.OWN_ONLY])).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("should throw NotFound if profile missing", async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.update(mockOwnerId, updateDto, mockOwnerId)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
