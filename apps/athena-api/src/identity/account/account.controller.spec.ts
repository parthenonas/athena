import { Pageable } from "@athena/types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";
import { AclGuard } from "../acl/acl.guard";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateAccountDto } from "./dto/create.dto";
import { FilterAccountDto } from "./dto/filter.dto";
import { LoginDto } from "./dto/login.dto";
import { ReadAccountDto } from "./dto/read.dto";
import { UpdateAccountDto } from "./dto/update.dto";
import { Account } from "./entities/account.entity";
import { JwtAuthGuard } from "./guards/jwt.guard";

describe("AccountController", () => {
  let controller: AccountController;
  let service: jest.Mocked<AccountService>;

  const mockAccount: Account = {
    id: "123",
    login: "admin",
    passwordHash: "hashed",
    roleId: "role-1",
    role: undefined as any,
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: AccountService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            validateCredentials: jest.fn(),
            generateAccessToken: jest.fn(),
            generateRefreshToken: jest.fn(),
            setRefreshCookie: jest.fn(),
            refresh: jest.fn(),
            changePassword: jest.fn(),
          },
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: AclGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
    service = module.get(AccountService);
  });

  describe("findAll", () => {
    it("should call service.findAll with filters", async () => {
      const filters: FilterAccountDto = {
        page: 1,
        limit: 20,
        sortBy: "login",
        sortOrder: "asc",
        search: "",
      };

      const response: Pageable<ReadAccountDto> = {
        data: [mockReadAccountDto],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          pages: 1,
        },
      };

      service.findAll.mockResolvedValue(response);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(response);
    });
  });

  describe("findMe", () => {
    it("should call service.findOne with user id", async () => {
      service.findOne.mockResolvedValue(mockReadAccountDto);

      const result = await controller.findMe("123");

      expect(service.findOne).toHaveBeenCalledWith("123");
      expect(result).toEqual(mockReadAccountDto);
    });
  });

  describe("findOne", () => {
    it("should call service.findOne with provided id", async () => {
      service.findOne.mockResolvedValue(mockReadAccountDto);

      const result = await controller.findOne("123");

      expect(service.findOne).toHaveBeenCalledWith("123");
      expect(result).toEqual(mockReadAccountDto);
    });
  });

  describe("create", () => {
    it("should call service.create with dto", async () => {
      service.create.mockResolvedValue(mockReadAccountDto);

      const result = await controller.create(mockCreateAccountDto);

      expect(service.create).toHaveBeenCalledWith(mockCreateAccountDto);
      expect(result).toEqual(mockReadAccountDto);
    });
  });

  describe("updateMe", () => {
    it("should call service.update with current user id", async () => {
      const dto: UpdateAccountDto = { login: "updated" };

      service.update.mockResolvedValue({ ...mockReadAccountDto, login: "updated" });

      const result = await controller.updateMe("123", dto);

      expect(service.update).toHaveBeenCalledWith("123", dto);
      expect(result.login).toBe("updated");
    });
  });

  describe("update", () => {
    it("should call service.update with id and dto", async () => {
      const dto: UpdateAccountDto = { login: "other" };

      service.update.mockResolvedValue({ ...mockReadAccountDto, login: "other" });

      const result = await controller.update("789", dto);

      expect(service.update).toHaveBeenCalledWith("789", dto);
      expect(result.login).toBe("other");
    });
  });

  describe("deleteMe", () => {
    it("should call service.softDelete with current user id and send 204", async () => {
      await controller.deleteMe("123");

      expect(service.softDelete).toHaveBeenCalledWith("123");
    });
  });

  describe("delete", () => {
    it("should soft delete by id and return 204", async () => {
      await controller.delete("999");

      expect(service.softDelete).toHaveBeenCalledWith("999");
    });
  });

  describe("login", () => {
    it("should validate credentials, generate tokens and set cookie", async () => {
      const dto: LoginDto = { login: "admin", password: "123" };

      service.validateCredentials.mockResolvedValue(mockAccount);
      service.generateAccessToken.mockResolvedValue("ACCESS");
      service.generateRefreshToken.mockResolvedValue("REFRESH");

      const res = { cookie: jest.fn() } as any;

      const result = await controller.login(dto, res);

      expect(service.validateCredentials).toHaveBeenCalledWith("admin", "123");
      expect(service.generateAccessToken).toHaveBeenCalledWith(mockAccount);
      expect(service.generateRefreshToken).toHaveBeenCalledWith(mockAccount);
      expect(service.setRefreshCookie).toHaveBeenCalledWith(res, "REFRESH");

      expect(result).toEqual({ accessToken: "ACCESS" });
    });
  });

  describe("refresh", () => {
    it("should refresh access token when cookie is present", async () => {
      const req: any = {
        cookies: {
          refresh_token: "REFRESH_TOKEN",
        },
      };

      service.refresh.mockResolvedValue("NEW_ACCESS_TOKEN");

      const result = await controller.refresh(req);

      expect(service.refresh).toHaveBeenCalledWith("REFRESH_TOKEN");

      expect(result).toEqual({ accessToken: "NEW_ACCESS_TOKEN" });
    });

    it("should throw BadRequestException when refresh token is missing", async () => {
      const req: any = {
        cookies: {},
      };

      await expect(controller.refresh(req)).rejects.toThrow("Missing refresh token");
    });
  });

  describe("changePassword", () => {
    it("should call service.changePassword with current user id and dto", async () => {
      const dto: ChangePasswordDto = {
        oldPassword: "Old_Password_123!",
        newPassword: "New_Password_123!",
      };

      await controller.changePassword("123", dto);

      expect(service.changePassword).toHaveBeenCalledWith("123", dto);
    });
  });
});
