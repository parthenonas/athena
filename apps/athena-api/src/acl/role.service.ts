import { Permission, Policy } from "@athena/types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { BaseService } from "../base/base.service";
import { CreateRoleDto } from "./dto/create.dto";
import { ReadRoleDto } from "./dto/read.dto";
import { Role } from "./entities/role.entity";

@Injectable()
export class RoleService extends BaseService<Role> {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
  ) {
    super();
  }

  /**
   * Finds a role by its name.
   * Returns undefined if not found.
   */
  async findByName(name: string): Promise<ReadRoleDto | null> {
    const role = await this.repo.findOne({ where: { name } });
    if (!role) return null;
    return this.toDto(role, ReadRoleDto);
  }

  /**
   * Creates a new role.
   */
  async create(dto: CreateRoleDto): Promise<ReadRoleDto> {
    const role = this.repo.create({
      name: dto.name,
      permissions: dto.permissions ?? [],
      policies: dto.policies ?? {},
    });

    const saved = await this.repo.save(role);
    return this.toDto(saved, ReadRoleDto);
  }

  /**
   * Ensures role exists, otherwise creates it.
   * Useful for CLI commands.
   */
  async ensureExists(
    name: string,
    permissions: Permission[] = [],
    policies: Partial<Record<Permission, Policy[]>> = {},
  ) {
    const role = await this.findByName(name);
    if (role) return role;
    return this.create({ name, permissions, policies });
  }

  /**
   * Returns all roles.
   */
  async findAll(): Promise<ReadRoleDto[]> {
    const records = await this.repo.find();
    return this.toDtoArray(records, ReadRoleDto);
  }

  /**
   * Gets role by UUID.
   */
  async findById(id: string): Promise<ReadRoleDto> {
    const role = await this.repo.findOne({ where: { id } });
    if (!role) throw new NotFoundException("Role not found");
    return this.toDto(role, ReadRoleDto);
  }

  /**
   * Updates permissions/policies.
   */
  async update(id: string, data: Partial<CreateRoleDto>): Promise<ReadRoleDto> {
    const role = await this.findById(id);

    if (data.name !== undefined) role.name = data.name;
    if (data.permissions !== undefined) role.permissions = data.permissions;
    if (data.policies !== undefined) role.policies = data.policies;

    const saved = await this.repo.save(role);
    return this.toDto(saved, ReadRoleDto);
  }
}
