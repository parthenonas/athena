import { Pageable, Permission, Policy } from "@athena/types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";

import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";
import { JwtAuthGuard } from "../account/guards/jwt.guard";
import { AclGuard } from "../acl/acl.guard";
import { CreateRoleDto } from "./dto/create.dto";
import { ReadRoleDto } from "./dto/read.dto";

describe("RoleController", () => {
  let controller: RoleController;
  let service: jest.Mocked<RoleService>;

  const mockRole: ReadRoleDto = {
    id: "role-1",
    name: "admin",
    permissions: [Permission.ADMIN],
    policies: {
      [Permission.ADMIN]: [Policy.OWN_ONLY],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateDto: CreateRoleDto = {
    name: "admin",
    permissions: [Permission.ADMIN],
    policies: mockRole.policies,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: RoleService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            updatePermissions: jest.fn(),
            updatePolicies: jest.fn(),
          },
        },
        { provide: JwtAuthGuard, useValue: { canActivate: jest.fn(() => true) } },
        { provide: AclGuard, useValue: { canActivate: jest.fn(() => true) } },
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
    service = module.get(RoleService);
  });

  describe("findAll", () => {
    it("should call service.findAll with filters and return pageable result", async () => {
      const filters: any = {
        page: 1,
        limit: 20,
        sortBy: "name",
        sortOrder: "ASC",
        search: "",
      };

      const pageable: Pageable<ReadRoleDto> = {
        data: [mockRole],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          pages: 1,
        },
      };

      service.findAll.mockResolvedValue(pageable);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(pageable);
    });
  });

  describe("findOne", () => {
    it("should return a role by id", async () => {
      service.findById.mockResolvedValue(mockRole);

      const result = await controller.findOne("role-1");

      expect(service.findById).toHaveBeenCalledWith("role-1");
      expect(result).toEqual(mockRole);
    });
  });

  describe("create", () => {
    it("should create a role", async () => {
      service.create.mockResolvedValue(mockRole);

      const result = await controller.create(mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(mockCreateDto);
      expect(result).toEqual(mockRole);
    });
  });

  describe("update", () => {
    it("should update a role", async () => {
      const updated = { ...mockRole, name: "updated" };
      service.update.mockResolvedValue(updated);

      const result = await controller.update("role-1", { name: "updated" });

      expect(service.update).toHaveBeenCalledWith("role-1", { name: "updated" });
      expect(result).toEqual(updated);
    });
  });

  describe("delete", () => {
    it("should delete a role and send 204", async () => {
      const res = { sendStatus: jest.fn() } as unknown as Response;

      service.delete.mockResolvedValue(undefined);

      await controller.delete("role-1", res);

      expect(service.delete).toHaveBeenCalledWith("role-1");
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });
  });

  describe("updatePermissions", () => {
    it("should update permissions for a role", async () => {
      const newPermissions = [Permission.COURSES_CREATE, Permission.COURSES_UPDATE];

      const updated: ReadRoleDto = {
        ...mockRole,
        permissions: newPermissions,
      };

      service.updatePermissions.mockResolvedValue(updated);

      const result = await controller.updatePermissions("role-1", {
        permissions: newPermissions,
      });

      expect(service.updatePermissions).toHaveBeenCalledWith("role-1", newPermissions);
      expect(result).toEqual(updated);
    });
  });

  describe("updatePolicies", () => {
    it("should update policies for a role", async () => {
      const newPolicies = {
        [Permission.COURSES_READ]: [Policy.OWN_ONLY],
      };

      const updated: ReadRoleDto = {
        ...mockRole,
        policies: newPolicies,
      };

      service.updatePolicies.mockResolvedValue(updated);

      const result = await controller.updatePolicies("role-1", {
        policies: newPolicies,
      });

      expect(service.updatePolicies).toHaveBeenCalledWith("role-1", newPolicies);
      expect(result).toEqual(updated);
    });
  });
});
