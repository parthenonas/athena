import { Policy } from "@athena/types";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuid } from "uuid";

import { CreateProfileDto } from "./dto/create.dto";
import { UpdateProfileDto } from "./dto/update.dto";
import { Profile } from "./entities/profile.entity";
import { ProfileService } from "./profile.service";
import { AbilityService } from "../acl/ability.service";

describe("ProfileService", () => {
  let service: ProfileService;
  let repo: Repository<Profile>;
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
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    repo = module.get<Repository<Profile>>(getRepositoryToken(Profile));
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
      mockRepo.findOne.mockResolvedValue(null);

      mockRepo.create.mockReturnValue(mockProfile);

      mockRepo.save.mockResolvedValue(mockProfile);

      const result = await service.create(mockOwnerId, createDto);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { ownerId: mockOwnerId } });
      expect(repo.create).toHaveBeenCalledWith({ ...createDto, ownerId: mockOwnerId });
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });

    it("should throw BadRequest if profile already exists", async () => {
      mockRepo.findOne.mockResolvedValue(mockProfile);

      await expect(service.create(mockOwnerId, createDto)).rejects.toThrow(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
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
      mockRepo.findOne.mockResolvedValue(mockProfile);
      mockAbilityService.check.mockReturnValue(true);
      mockRepo.merge.mockImplementation((entity, dto) => Object.assign(entity, dto));
      mockRepo.save.mockResolvedValue({ ...mockProfile, firstName: "Petr" });

      const result = await service.update(mockOwnerId, updateDto, mockOwnerId, [Policy.OWN_ONLY]);

      expect(abilityService.check).toHaveBeenCalledWith(Policy.OWN_ONLY, mockOwnerId, mockProfile);
      expect(repo.merge).toHaveBeenCalledWith(mockProfile, updateDto);
      expect(result.firstName).toBe("Petr");
    });

    it("should throw ForbiddenException if policy check fails", async () => {
      mockRepo.findOne.mockResolvedValue(mockProfile);
      mockAbilityService.check.mockReturnValue(false);

      await expect(service.update(mockOwnerId, updateDto, "stranger-id", [Policy.OWN_ONLY])).rejects.toThrow(
        ForbiddenException,
      );

      expect(repo.save).not.toHaveBeenCalled();
    });

    it("should throw NotFound if profile missing", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.update(mockOwnerId, updateDto, mockOwnerId)).rejects.toThrow(NotFoundException);
    });
  });
});
