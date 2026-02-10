jest.mock("../account/entities/account.entity", () => ({
  Account: class MockAccount {},
}));

import { PostgresErrorCode } from "@athena/common";
import { Permission, Policy } from "@athena/types";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, QueryFailedError, Repository } from "typeorm";

import { CreateRoleDto } from "./dto/create.dto";
import { FilterRoleDto } from "./dto/filter.dto";
import { ReadRoleDto } from "./dto/read.dto";
import { Role } from "./entities/role.entity";
import { RoleService } from "./role.service";
import { OutboxService } from "../../outbox";
import { AthenaEvent } from "../../shared/events/types";

describe("RoleService", () => {
  let service: RoleService;
  let repo: jest.Mocked<Repository<Role>>;
  let dataSource: jest.Mocked<DataSource>;
  let outboxService: jest.Mocked<OutboxService>;

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

  const queryRunnerMock = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      create: jest.fn(),
    },
  };

  const createQueryBuilderMock = () => {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
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
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(qbMock),
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(queryRunnerMock),
          },
        },
        {
          provide: OutboxService,
          useValue: {
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    repo = module.get(getRepositoryToken(Role));
    dataSource = module.get(DataSource);
    outboxService = module.get(OutboxService);
  });

  describe("findAll (pagination + search + sort)", () => {
    it("should return paginated roles", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[mockRole], 1]);

      const filters: FilterRoleDto = {
        page: 1,
        limit: 10,
        sortBy: "name",
        sortOrder: "ASC",
        search: "",
      };

      const result = await service.findAll(filters);

      expect(repo.createQueryBuilder).toHaveBeenCalledWith("r");
      expect(qbMock.orderBy).toHaveBeenCalledWith("r.name", "ASC");
      expect(qbMock.skip).toHaveBeenCalledWith(0);
      expect(qbMock.take).toHaveBeenCalledWith(10);

      expect(result.data).toEqual([mockReadRole]);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      });
    });

    it("should apply search filter", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      const filters: FilterRoleDto = {
        page: 1,
        limit: 20,
        sortBy: "name",
        sortOrder: "ASC",
        search: "adm",
      };

      await service.findAll(filters);

      expect(qbMock.where).toHaveBeenCalledWith("r.name ILIKE :search", {
        search: "%adm%",
      });
    });

    it("should throw BadRequestException on DB error", async () => {
      qbMock.getManyAndCount.mockRejectedValue(new Error("db crashed"));

      const filters: FilterRoleDto = {
        page: 1,
        limit: 10,
        sortBy: "name",
        sortOrder: "ASC",
        search: "",
      };

      await expect(service.findAll(filters)).rejects.toBeInstanceOf(BadRequestException);
    });
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
      queryRunnerMock.manager.findOne.mockResolvedValue(mockRole);
      queryRunnerMock.manager.remove.mockResolvedValue(mockRole);

      await expect(service.delete("role-1")).resolves.toBeUndefined();

      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(queryRunnerMock.connect).toHaveBeenCalled();
      expect(queryRunnerMock.startTransaction).toHaveBeenCalled();

      expect(queryRunnerMock.manager.findOne).toHaveBeenCalledWith(Role, { where: { id: "role-1" } });
      expect(queryRunnerMock.manager.remove).toHaveBeenCalledWith(Role, mockRole);

      expect(outboxService.save).toHaveBeenCalledWith(queryRunnerMock.manager, AthenaEvent.ROLE_DELETED, {
        name: mockRole.name,
      });
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });

    it("should throw NotFoundException if role does not exist", async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue(null);

      await expect(service.delete("x")).rejects.toBeInstanceOf(NotFoundException);

      expect(queryRunnerMock.startTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.manager.remove).not.toHaveBeenCalled();
      expect(outboxService.save).not.toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });

    it("should throw ConflictException on FK violation", async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue(mockRole);

      const pgError: any = new QueryFailedError("fk error", [], new Error());
      pgError.code = PostgresErrorCode.FOREIGN_KEY_VIOLATION;
      pgError.constraint = "accounts__role_id__fk";

      queryRunnerMock.manager.remove.mockRejectedValue(pgError);

      await expect(service.delete("role-1")).rejects.toMatchObject({
        constructor: ConflictException,
        message: "Cannot delete role: it is used by existing accounts",
      });

      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });

    it("should throw BadRequestException on other db errors", async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue(mockRole);
      const pgError: any = new Error("some db error");

      queryRunnerMock.manager.remove.mockRejectedValue(pgError);

      await expect(service.delete("role-1")).rejects.toBeInstanceOf(BadRequestException);
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe("updatePermissions", () => {
    it("should update permissions", async () => {
      const updated = {
        ...mockRole,
        permissions: [Permission.ADMIN],
      };

      repo.findOne.mockResolvedValue(mockRole);
      repo.save.mockResolvedValue(updated);

      const result = await service.updatePermissions("role-1", [Permission.ADMIN]);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "role-1" } });
      expect(repo.save).toHaveBeenCalledWith(updated);
      expect(result.permissions).toEqual([Permission.ADMIN]);
    });

    it("should throw NotFoundException if role not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.updatePermissions("xxx", [Permission.ADMIN])).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw BadRequestException on db error", async () => {
      repo.findOne.mockResolvedValue(mockRole);

      const pgError: any = new Error("db error");
      pgError.code = "99999";

      repo.save.mockRejectedValue(pgError);

      await expect(service.updatePermissions("role-1", [Permission.ADMIN])).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("updatePolicies", () => {
    it("should update policies", async () => {
      const newPolicies = {
        [Permission.COURSES_DELETE]: [Policy.NOT_PUBLISHED],
      };

      const updated = {
        ...mockRole,
        policies: newPolicies,
      };

      repo.findOne.mockResolvedValue(mockRole);
      repo.save.mockResolvedValue(updated);

      const result = await service.updatePolicies("role-1", newPolicies);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "role-1" } });
      expect(repo.save).toHaveBeenCalledWith(updated);
      expect(result.policies).toEqual(newPolicies);
    });

    it("should throw NotFoundException if role not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updatePolicies("xxx", { [Permission.COURSES_UPDATE]: [Policy.OWN_ONLY] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw BadRequestException on db error", async () => {
      repo.findOne.mockResolvedValue(mockRole);

      const pgError: any = new Error("db failure");
      pgError.code = "99999";

      repo.save.mockRejectedValue(pgError);

      await expect(
        service.updatePolicies("role-1", { [Permission.COURSES_UPDATE]: [Policy.OWN_ONLY] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
