jest.mock("../account/entities/account.entity", () => ({
  Account: class MockAccount {},
}));

import { Permission, Policy } from "@athena-lms/shared";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CreateRoleDto } from "./dto/create.dto";
import { ReadRoleDto } from "./dto/read.dto";
import { Role } from "./entities/role.entity";
import { RoleService } from "./role.service";

describe("RoleService", () => {
  let service: RoleService;
  let repo: jest.Mocked<Repository<Role>>;

  const mockRole: Role = {
    id: "role-1",
    name: "admin",
    permissions: [Permission.COURSES_CREATE, Permission.COURSES_UPDATE, Permission.COURSES_READ],
    policies: {
      [Permission.COURSES_UPDATE]: [Policy.OWN_ONLY],
    },
    accounts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockReadRole: ReadRoleDto = {
    id: mockRole.id,
    name: mockRole.name,
    permissions: mockRole.permissions,
    policies: mockRole.policies,
    createdAt: mockRole.createdAt,
    updatedAt: mockRole.updatedAt,
  };

  const mockCreateDto: CreateRoleDto = {
    name: "admin",
    permissions: [Permission.ADMIN],
    policies: mockRole.policies,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    repo = module.get(getRepositoryToken(Role));
  });

  describe("findByName", () => {
    it("should return a role by name", async () => {
      repo.findOne.mockResolvedValue(mockRole);
      const result = await service.findByName("admin");
      expect(repo.findOne).toHaveBeenCalledWith({ where: { name: "admin" } });
      expect(result).toEqual(mockReadRole);
    });

    it("should return null when not found", async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.findByName("none");
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create a role", async () => {
      repo.create.mockReturnValue(mockRole);
      repo.save.mockResolvedValue(mockRole);
      const result = await service.create(mockCreateDto);
      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(mockReadRole);
    });
  });

  describe("ensureExists", () => {
    it("should return existing role", async () => {
      jest.spyOn(service, "findByName").mockResolvedValue(mockReadRole);
      const result = await service.ensureExists("admin");
      expect(result).toEqual(mockReadRole);
    });

    it("should create role if not exists", async () => {
      jest.spyOn(service, "findByName").mockResolvedValue(null);
      jest.spyOn(service, "create").mockResolvedValue(mockReadRole);
      const result = await service.ensureExists("admin");
      expect(service.create).toHaveBeenCalledWith({
        name: "admin",
        permissions: [],
        policies: {},
      });
      expect(result).toEqual(mockReadRole);
    });
  });

  describe("findAll", () => {
    it("should return all roles", async () => {
      repo.find.mockResolvedValue([mockRole]);
      const result = await service.findAll();
      expect(repo.find).toHaveBeenCalled();
      expect(result).toEqual([mockReadRole]);
    });
  });

  describe("findById", () => {
    it("should return role by id", async () => {
      repo.findOne.mockResolvedValue(mockRole);
      const result = await service.findById("role-1");
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "role-1" } });
      expect(result).toEqual(mockReadRole);
    });

    it("should throw NotFoundException if role not found", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById("xx")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update a role", async () => {
      const updated = {
        ...mockRole,
        name: "updated",
      };
      jest.spyOn(service, "findById").mockResolvedValue(mockReadRole);
      repo.save.mockResolvedValue(updated);
      const result = await service.update("role-1", { name: "updated" });
      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe("updated");
    });

    it("should throw NotFoundException if role not found", async () => {
      jest.spyOn(service, "findById").mockRejectedValue(new NotFoundException());
      await expect(service.update("x", { name: "z" })).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
