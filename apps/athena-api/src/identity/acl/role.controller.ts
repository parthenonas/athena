import { Permission, Policy } from "@athena/types";
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";

import { CreateRoleDto } from "./dto/create.dto";
import { ReadRoleDto } from "./dto/read.dto";
import { UpdateRolePermissionsDto } from "./dto/update-permissions.dto";
import { UpdateRolePoliciesDto } from "./dto/update-policies.dto";
import { RoleService } from "./role.service";
import { JwtAuthGuard } from "../account/guards/jwt.guard";
import { AclGuard } from "../acl/acl.guard";
import { RequirePermission } from "../acl/decorators/require-permission.decorator";

/**
 * @Controller RoleController
 *
 * Handles all HTTP endpoints for managing system roles.
 *
 * Responsibilities:
 * - Listing roles
 * - Retrieving a role by ID
 * - Creating new roles
 * - Updating role permissions/policies
 * - Deleting roles (with FK protection)
 *
 * All endpoints require:
 * - Authentication via `JwtAuthGuard`
 * - Access control via `AclGuard`
 * - Explicit permission via `@RequirePermission`
 *
 * Errors:
 * - Database-level constraint issues automatically transformed
 *   into friendly HTTP exceptions at service layer.
 */
@Controller("roles")
export class RoleController {
  constructor(private readonly service: RoleService) {}

  /**
   * GET /roles
   * Returns a list of all roles.
   *
   * Requires: admin-level access (Permission.ADMIN)
   */
  @Get()
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ADMIN)
  async findAll(): Promise<ReadRoleDto[]> {
    return this.service.findAll();
  }

  /**
   * GET /roles/:id
   * Retrieve a role by its UUID.
   *
   * Requires: admin-level access (Permission.ADMIN)
   */
  @Get(":id")
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ADMIN)
  async findOne(@Param("id") id: string): Promise<ReadRoleDto> {
    return this.service.findById(id);
  }

  /**
   * POST /roles
   * Creates a new system role.
   *
   * Requires: admin-level access (Permission.ADMIN)
   */
  @Post()
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ADMIN)
  async create(@Body() dto: CreateRoleDto): Promise<ReadRoleDto> {
    this.manualPoliciesCheck(dto.policies);
    return this.service.create(dto);
  }

  /**
   * PATCH /roles/:id
   * Updates a role's name, permissions, or policies.
   *
   * Requires: admin-level access (Permission.ADMIN)
   */
  @Patch(":id")
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ADMIN)
  async update(@Param("id") id: string, @Body() dto: Partial<CreateRoleDto>): Promise<ReadRoleDto> {
    this.manualPoliciesCheck(dto.policies);
    return this.service.update(id, dto);
  }

  /**
   * DELETE /roles/:id
   * Deletes a role.
   *
   * FK-protected:
   * - If any account references this role, throws ConflictException.
   *
   * Requires: admin-level access (Permission.ADMIN)
   */
  @Delete(":id")
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ADMIN)
  async delete(@Param("id") id: string, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.service.delete(id);
    res.sendStatus(204);
  }

  /**
   * PATCH /roles/:id/permissions
   *
   * Updates the permission set of a specific role.
   * This operation completely replaces the existing list of permissions.
   *
   * Requires: admin-level access (`Permission.ADMIN`)
   */
  @Patch(":id/permissions")
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ADMIN)
  async updatePermissions(@Param("id") id: string, @Body() dto: UpdateRolePermissionsDto): Promise<ReadRoleDto> {
    return this.service.updatePermissions(id, dto.permissions);
  }

  /**
   * PATCH /roles/:id/policies
   *
   * Updates the object-level policies applied to permissions of a role.
   * This operation replaces the entire policy map for the role.
   *
   * Requires: admin-level access (`Permission.ADMIN`)
   */
  @Patch(":id/policies")
  @UseGuards(JwtAuthGuard, AclGuard)
  @RequirePermission(Permission.ADMIN)
  async updatePolicies(@Param("id") id: string, @Body() dto: UpdateRolePoliciesDto): Promise<ReadRoleDto> {
    this.manualPoliciesCheck(dto.policies);
    return this.service.updatePolicies(id, dto.policies);
  }

  private manualPoliciesCheck(policy?: Partial<Record<Permission, Policy[]>>) {
    // manual validation of policies map
    for (const [perm, policies] of Object.entries(policy ?? {})) {
      if (!Object.values(Permission).includes(perm as Permission)) {
        throw new BadRequestException(`Invalid permission key: ${perm}`);
      }
      if (!Array.isArray(policies)) {
        throw new BadRequestException(`Policies for ${perm} must be an array`);
      }
      for (const pol of policies) {
        if (!Object.values(Policy).includes(pol)) {
          throw new BadRequestException(`Invalid policy: ${pol} for permission: ${perm}`);
        }
      }
    }
  }
}
