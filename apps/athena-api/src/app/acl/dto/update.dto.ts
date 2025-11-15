import { Permission, Policy } from "@athena-lms/shared/types/acl";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";

/**
 * @class UpdateRoleDto
 * DTO for updating an existing role.
 * All fields are optional.
 */
export class UpdateRoleDto {
  /** Updated role name (optional). */
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  /** Updated list of permissions (optional). */
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];

  /**
   * Updated policies (optional).
   * Passing `{}` removes all policies.
   */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Object)
  policies?: Partial<Record<Permission, Policy[]>>;
}
