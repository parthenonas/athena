import { Permission, Policy, UpdateRoleRequest } from "@athena/types";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MinLength } from "class-validator";

/**
 * @class UpdateRoleDto
 * DTO for updating an existing role.
 * All fields are optional.
 */
export class UpdateRoleDto implements UpdateRoleRequest {
  /** Updated role name (optional). */
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  /** Updated list of permissions (optional). */
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions!: Permission[];

  /**
   * Updated policies (optional).
   * Passing `{}` removes all policies.
   */
  @IsOptional()
  @IsObject()
  policies!: Partial<Record<Permission, Policy[]>>;
}
