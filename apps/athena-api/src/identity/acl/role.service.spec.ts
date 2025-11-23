jest.mock("../account/entities/account.entity", () => ({
  Account: class MockAccount {},
}));

import { PostgresErrorCode } from "@athena/common";
import { Permission, Policy } from "@athena/types";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

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
  };

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

    it("should throw ConflictException on duplicate name", async () => {
      const pgError: any = new QueryFailedError("duplicate", [], new Error());
      pgError.code = PostgresErrorCode.UNIQUE_VIOLATION;
      pgError.constraint = "roles__name__uk";

      repo.create.mockReturnValue(mockRole);
      repo.save.mockRejectedValue(pgError);

      await expect(service.create(mockCreateDto)).rejects.toMatchObject({
        constructor: ConflictException,
        message: "Role name already in use",
      });
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

      repo.findOne.mockResolvedValue(mockRole);

      repo.save.mockResolvedValue(updated);

      const result = await service.update("role-1", { name: "updated" });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "role-1" } });
      expect(repo.save).toHaveBeenCalledWith(updated);
      expect(result.name).toBe("updated");
    });

    it("should throw NotFoundException if role not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update("x", { name: "z" })).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw ConflictException on duplicate role name", async () => {
      repo.findOne.mockResolvedValue(mockRole);

      const pgError: any = new QueryFailedError("duplicate", [], new Error());
      pgError.code = PostgresErrorCode.UNIQUE_VIOLATION;
      pgError.constraint = "roles__name__uk";

      repo.save.mockRejectedValue(pgError);

      await expect(service.update("role-1", { name: "duplicate" })).rejects.toMatchObject({
        constructor: ConflictException,
        message: "Role name already in use",
      });
    });

    it("should throw BadRequestException on other DB errors", async () => {
      repo.findOne.mockResolvedValue(mockRole);

      const pgError: any = new QueryFailedError("weird error", [], new Error());
      pgError.code = "99999";

      repo.save.mockRejectedValue(pgError);

      await expect(service.update("role-1", { name: "new" })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("delete", () => {
    it("should delete a role", async () => {
      repo.delete = jest.fn().mockResolvedValue({ affected: 1 });

      await expect(service.delete("role-1")).resolves.toBeUndefined();

      expect(repo.delete).toHaveBeenCalledWith("role-1");
    });

    it("should throw NotFoundException if role does not exist", async () => {
      repo.delete = jest.fn().mockResolvedValue({ affected: 0 });

      await expect(service.delete("x")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw ConflictException on FK violation", async () => {
      const pgError: any = new QueryFailedError("fk error", [], new Error());
      pgError.code = PostgresErrorCode.FOREIGN_KEY_VIOLATION;
      pgError.constraint = "accounts__role_id__fk";

      repo.delete = jest.fn().mockRejectedValue(pgError);

      await expect(service.delete("role-1")).rejects.toMatchObject({
        constructor: ConflictException,
        message: "Cannot delete role: it is used by existing accounts",
      });
    });

    it("should throw BadRequestException on other db errors", async () => {
      const pgError: any = new Error("some db error");
      pgError.code = "99999";

      repo.delete = jest.fn().mockRejectedValue(pgError);

      await expect(service.delete("role-1")).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
