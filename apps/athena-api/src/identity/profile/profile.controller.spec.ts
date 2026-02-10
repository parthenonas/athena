import { Policy } from "@athena/types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { type Request } from "express";
import { v4 as uuid } from "uuid";

import { CreateProfileDto } from "./dto/create.dto";
import { UpdateProfileDto } from "./dto/update.dto";
import { Profile } from "./entities/profile.entity";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

describe("ProfileController", () => {
  let controller: ProfileController;
  let service: ProfileService;

  const mockUserId = uuid();
  const mockTargetId = uuid();

  const mockProfile = {
    id: uuid(),
    ownerId: mockUserId,
    firstName: "Test",
    lastName: "User",
    metadata: {},
  } as Profile;

  const mockProfileService = {
    findByOwnerId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const createMockRequest = (policies: Policy[] = []) =>
    ({
      appliedPolicies: policies,
    }) as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: mockProfileService,
        },

        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    service = module.get<ProfileService>(ProfileService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getMe", () => {
    it("should retrieve own profile", async () => {
      const policies = [Policy.OWN_ONLY];
      const req = createMockRequest(policies);
      mockProfileService.findByOwnerId.mockResolvedValue(mockProfile);

      const result = await controller.getMe(mockUserId, req);

      expect(service.findByOwnerId).toHaveBeenCalledWith(mockUserId, mockUserId, policies);
      expect(result).toEqual(mockProfile);
    });
  });

  describe("createMe", () => {
    it("should create profile for self", async () => {
      const dto: CreateProfileDto = { firstName: "Ivan", lastName: "Ivanov" };
      mockProfileService.create.mockResolvedValue(mockProfile);

      const result = await controller.createMe(mockUserId, dto);

      expect(service.create).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual(mockProfile);
    });
  });

  describe("updateMe", () => {
    it("should update own profile", async () => {
      const dto: UpdateProfileDto = { firstName: "Petr" };
      const policies = [Policy.OWN_ONLY];
      const req = createMockRequest(policies);
      mockProfileService.update.mockResolvedValue(mockProfile);

      await controller.updateMe(mockUserId, dto, req);

      expect(service.update).toHaveBeenCalledWith(mockUserId, dto, mockUserId, policies);
    });
  });

  describe("getOne", () => {
    it("should retrieve specific profile by ownerId", async () => {
      const policies = [];
      const req = createMockRequest(policies);
      mockProfileService.findByOwnerId.mockResolvedValue(mockProfile);

      await controller.getOne(mockTargetId, mockUserId, req);

      expect(service.findByOwnerId).toHaveBeenCalledWith(mockTargetId, mockUserId, policies);
    });
  });

  describe("create", () => {
    it("should create profile for specific user (Admin case)", async () => {
      const dto: CreateProfileDto = { firstName: "AdminCreated", lastName: "User" };
      mockProfileService.create.mockResolvedValue(mockProfile);

      await controller.create(mockTargetId, dto);

      expect(service.create).toHaveBeenCalledWith(mockTargetId, dto);
    });
  });

  describe("update", () => {
    it("should update specific profile by ownerId", async () => {
      const dto: UpdateProfileDto = { firstName: "UpdatedByAdmin" };
      const policies = [];
      const req = createMockRequest(policies);
      mockProfileService.update.mockResolvedValue(mockProfile);

      await controller.update(mockTargetId, dto, mockUserId, req);

      expect(service.update).toHaveBeenCalledWith(mockTargetId, dto, mockUserId, policies);
    });
  });
});
