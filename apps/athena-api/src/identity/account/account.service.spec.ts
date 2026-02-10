jest.mock("argon2", () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));

import { PostgresErrorCode } from "@athena/common";
import { Permission } from "@athena/types";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as argon2 from "argon2";
import { QueryFailedError, Repository } from "typeorm";

import { AccountService } from "./account.service";
import { CreateAccountDto } from "./dto/create.dto";
import { ReadAccountDto } from "./dto/read.dto";
import { Account } from "./entities/account.entity";

describe("AccountService", () => {
  let service: AccountService;
  let repo: jest.Mocked<Repository<Account>>;

  const mockAccount: Account = {
    id: "123",
    login: "admin",
    passwordHash: "hashed",
    roleId: "role-1",
    role: {
      id: "1",
      name: "admin",
      permissions: [Permission.ADMIN],
      policies: {},
      accounts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    status: "active" as any,
    profile: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockCreateAccountDto: CreateAccountDto = {
    login: "admin",
    password: "password",
    roleId: mockAccount.roleId,
  };

  const mockReadAccountDto: ReadAccountDto = {
    id: mockAccount.id,
    login: mockAccount.login,
    roleId: mockAccount.roleId,
    status: mockAccount.status,
    createdAt: mockAccount.createdAt,
    updatedAt: mockAccount.updatedAt,
  };

  const createQueryBuilderMock = () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
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
    jest.clearAllMocks();
    qbMock = createQueryBuilderMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: getRepositoryToken(Account),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(qbMock),
            findOne: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case "JWT_ACCESS_TTL_SECONDS":
                  return 900;
                case "JWT_REFRESH_TTL_SECONDS":
                  return 604800;
                case "JWT_ACCESS_SECRET":
                  return "ACCESS_SECRET";
                case "JWT_REFRESH_SECRET":
                  return "REFRESH_SECRET";
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
    repo = module.get(getRepositoryToken(Account));
  });

  describe("findAll", () => {
    it("should return paginated accounts", async () => {
      const mockEntities = [
        { id: "1", login: "user1" },
        { id: "2", login: "user2" },
      ];

      qbMock.getManyAndCount.mockResolvedValue([mockEntities, 2]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        sortBy: "login",
        sortOrder: "asc",
        search: "",
      });

      expect(repo.createQueryBuilder).toHaveBeenCalledWith("a");
      expect(qbMock.orderBy).toHaveBeenCalledWith("a.login", "ASC");
      expect(qbMock.skip).toHaveBeenCalledWith(0);
      expect(qbMock.take).toHaveBeenCalledWith(10);

      expect(result.meta.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it("should apply search filter when provided", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        sortBy: "login",
        sortOrder: "asc",
        search: "test",
      });

      expect(qbMock.andWhere).toHaveBeenCalledWith("a.login ILIKE :search", {
        search: "%test%",
      });
    });

    it("should NOT call andWhere if search is empty", async () => {
      qbMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        sortBy: "login",
        sortOrder: "asc",
        search: "",
      });

      expect(qbMock.andWhere).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when DB fails", async () => {
      qbMock.getManyAndCount.mockRejectedValue(new Error("DB exploded"));

      await expect(
        service.findAll({
          page: 1,
          limit: 10,
          sortBy: "login",
          sortOrder: "asc",
          search: "",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("findOne", () => {
    it("should return an account by id", async () => {
      repo.findOne.mockResolvedValue(mockAccount);

      const result = await service.findOne(mockAccount.id);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
      });

      expect(result).toEqual(mockReadAccountDto);
    });

    it("should throw NotFoundException if account does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nope")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw BadRequestException on DB error", async () => {
      repo.findOne.mockRejectedValue(new Error("db down"));

      await expect(service.findOne("123")).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("findOneByLogin", () => {
    it("should return an account by login", async () => {
      repo.findOne.mockResolvedValue(mockAccount);

      const result = await service.findOneByLogin(mockAccount.login);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { login: mockAccount.login },
      });

      expect(result).toEqual(mockReadAccountDto);
    });

    it("should throw NotFoundException if account does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOneByLogin("nope")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw BadRequestException on DB error", async () => {
      repo.findOne.mockRejectedValue(new Error("db down"));

      await expect(service.findOneByLogin("123")).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("create", () => {
    it("should create an account", async () => {
      repo.create.mockReturnValue(mockAccount);

      repo.save.mockResolvedValue(mockAccount);

      const result = await service.create(mockCreateAccountDto);

      expect(repo.create).toHaveBeenCalled();

      expect(repo.save).toHaveBeenCalled();

      expect(result).toMatchObject(mockReadAccountDto);
    });

    it("should throw ConflictException on UNIQUE violation", async () => {
      const error: any = new QueryFailedError("duplicate", [], new Error());
      error.code = PostgresErrorCode.UNIQUE_VIOLATION;
      error.constraint = "accounts__login__uk";

      repo.save.mockRejectedValue(error);

      await expect(service.create(mockCreateAccountDto)).rejects.toThrow("Login already in use");
    });

    it("should throw ConflictException on FK violation", async () => {
      const error: any = new QueryFailedError("fk error", [], new Error());
      error.code = PostgresErrorCode.FOREIGN_KEY_VIOLATION;
      error.constraint = "accounts__role_id__fk";

      repo.save.mockRejectedValue(error);

      await expect(service.create(mockCreateAccountDto)).rejects.toThrow("Role not found");
    });

    it("should throw BadRequestException on other DB errors", async () => {
      repo.save.mockRejectedValue(new Error("unknown db error"));

      await expect(service.create(mockCreateAccountDto)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("update", () => {
    it("should update an account", async () => {
      const newLogin = "updated";
      repo.findOne.mockResolvedValue(mockAccount);

      repo.save.mockResolvedValue({
        ...mockAccount,
        login: newLogin,
      });

      const result = await service.update(mockAccount.id, { login: newLogin });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
      });

      expect(repo.save).toHaveBeenCalled();

      expect(result.login).toBe(newLogin);
    });

    it("should throw NotFoundException when account does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update("nope", { login: "x" })).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw ConflictException on UNIQUE violation", async () => {
      repo.findOne.mockResolvedValue(mockAccount);

      const error: any = new QueryFailedError("duplicate", [], new Error());
      error.code = PostgresErrorCode.UNIQUE_VIOLATION;
      error.constraint = "accounts__login__uk";

      repo.save.mockRejectedValue(error);

      await expect(service.update(mockAccount.id, { login: "duplicate" })).rejects.toThrow("Login already in use");
    });

    it("should throw ConflictException on FK violation", async () => {
      repo.findOne.mockResolvedValue(mockAccount);

      const error: any = new QueryFailedError("fk error", [], new Error());
      error.code = PostgresErrorCode.FOREIGN_KEY_VIOLATION;
      error.constraint = "accounts__role_id__fk";

      repo.save.mockRejectedValue(error);

      await expect(service.update(mockAccount.id, { roleId: "bad-role" })).rejects.toThrow("Role not found");
    });

    it("should throw BadRequestException on unknown DB error", async () => {
      repo.findOne.mockResolvedValue(mockAccount);

      repo.save.mockRejectedValue(new Error("unknown db error"));

      await expect(service.update(mockAccount.id, { login: "x" })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("softDelete", () => {
    it("should soft delete an account", async () => {
      repo.softDelete.mockResolvedValue({
        raw: {},
        generatedMaps: [],
        affected: 1,
      });

      await service.softDelete(mockAccount.id);

      expect(repo.softDelete).toHaveBeenCalledWith(mockAccount.id);
    });

    it("should throw NotFoundException if account was not deleted", async () => {
      repo.softDelete.mockResolvedValue({
        raw: {},
        generatedMaps: [],
        affected: 0,
      });

      await expect(service.softDelete("nope")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw BadRequestException on DB error", async () => {
      repo.softDelete.mockRejectedValue(new Error("db err"));

      await expect(service.softDelete("123")).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("validateCredentials", () => {
    const verifySpy = argon2.verify as jest.Mock;

    it("should return account on valid credentials", async () => {
      repo.findOne.mockResolvedValue(mockAccount);
      verifySpy.mockResolvedValue(true);

      const result = await service.validateCredentials("admin", "password");

      expect(repo.findOne).toHaveBeenCalledWith({ where: { login: "admin" }, relations: ["role"] });
      expect(result).toEqual(mockAccount);
    });

    it("should throw NotFoundException if account does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.validateCredentials("none", "password")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw NotFoundException if password is invalid", async () => {
      repo.findOne.mockResolvedValue(mockAccount);
      verifySpy.mockResolvedValue(false);

      await expect(service.validateCredentials("admin", "wrong")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("generateAccessToken", () => {
    it("should generate an access token", async () => {
      const token = "access-token";

      (service as any).jwt.signAsync.mockResolvedValue(token);

      const result = await service.generateAccessToken({
        ...mockAccount,
        role: {
          id: "1",
          accounts: [],
          name: "admin",
          permissions: [Permission.ADMIN],
          policies: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      expect(service["jwt"].signAsync).toHaveBeenCalled();

      expect(result).toBe(token);
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a refresh token", async () => {
      const token = "refresh-token";

      (service as any).jwt.signAsync.mockResolvedValue(token);

      const result = await service.generateRefreshToken(mockAccount);

      expect(service["jwt"].signAsync).toHaveBeenCalled();

      expect(result).toBe(token);
    });
  });

  describe("setRefreshCookie", () => {
    it("should set refresh token cookie", () => {
      const res: any = {
        cookie: jest.fn(),
      };

      service.setRefreshCookie(res, "refresh-token");

      expect(res.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "refresh-token",
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: "strict",
          path: "/",
        }),
      );
    });
  });

  describe("refresh", () => {
    it("should generate a new access token when refresh token is valid", async () => {
      const mockPayload = { sub: "user-123" };

      (service as any).jwt.verifyAsync.mockResolvedValue(mockPayload);
      service.generateAccessToken = jest.fn().mockReturnValue("NEW_ACCESS_TOKEN");
      repo.findOne.mockResolvedValue(mockAccount);

      const result = await service.refresh("VALID_REFRESH_TOKEN");

      expect((service as any).jwt.verifyAsync).toHaveBeenCalledWith("VALID_REFRESH_TOKEN", {
        secret: "REFRESH_SECRET",
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "user-123" },
        relations: ["role"],
      });

      expect(service.generateAccessToken).toHaveBeenCalledWith(mockAccount);
      expect(result).toBe("NEW_ACCESS_TOKEN");
    });

    it("should throw BadRequestException when refresh token is invalid", async () => {
      (service as any).jwt.verifyAsync.mockRejectedValue(new Error("invalid token"));

      await expect(service.refresh("BAD_TOKEN")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("should throw NotFoundException when account does not exist", async () => {
      const mockPayload = { sub: "missing-id" };

      (service as any).jwt.verifyAsync.mockResolvedValue(mockPayload);
      repo.findOne.mockResolvedValue(null);

      await expect(service.refresh("VALID_REFRESH_TOKEN")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("changePassword", () => {
    const verifySpy = argon2.verify as jest.Mock;
    const hashSpy = argon2.hash as jest.Mock;

    it("should verify old password and update with new hash", async () => {
      repo.findOne.mockResolvedValue({ ...mockAccount });
      verifySpy.mockResolvedValue(true);
      hashSpy.mockResolvedValue("new_hashed_password");
      repo.save.mockResolvedValue({ ...mockAccount, passwordHash: "new_hashed_password" });

      await service.changePassword("123", {
        oldPassword: "Old_Valid_123!",
        newPassword: "New_Valid_123!",
      });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "123" } });
      expect(verifySpy).toHaveBeenCalledWith(mockAccount.passwordHash, "Old_Valid_123!");
      expect(hashSpy).toHaveBeenCalledWith("New_Valid_123!");

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "123",
          passwordHash: "new_hashed_password",
        }),
      );
    });

    it("should throw NotFoundException if account not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword("999", {
          oldPassword: "any",
          newPassword: "any",
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw ForbiddenException if old password is invalid", async () => {
      repo.findOne.mockResolvedValue(mockAccount);

      verifySpy.mockResolvedValue(false);

      await expect(
        service.changePassword("123", {
          oldPassword: "wrong_old",
          newPassword: "new",
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
