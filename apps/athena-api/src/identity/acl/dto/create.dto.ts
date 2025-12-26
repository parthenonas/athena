import { CreateRoleRequest, Permission, Policy } from "@athena/types";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MinLength } from "class-validator";

/**
 * @class CreateRoleDto
 * DTO used for creating a new role in the ACL system.
 *
 * A Role defines:
 * - a human-readable name (e.g. "teacher", "student", "admin")
 * - a set of permissions (coarse-grained access rights)
 * - optional policies that further restrict specific permissions
 *
 * `policies` is represented as a partial map:
 *    { "courses.update": ["own_only"] }
 *
 * If a permission is not present in `policies`, it has no policy restrictions.
 */
export class CreateRoleDto implements CreateRoleRequest {
  /**
   * Human-readable role name.
   * Must be unique in the system.
   */
  @IsString()
  @MinLength(3)
  name!: string;

  /**
   * List of permissions assigned to the role.
   * Example:
   *  ["courses.read", "courses.update", "lessons.read"]
   */
  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];

  /**
   * Optional map of policies for individual permissions.
   *
   * Example:
   * {
   *   "courses.update": ["own_only"],
   *   "courses.read": ["not_published"]
   * }
   *
   * Only permissions listed in this object get additional restrictions.
   */
  @IsOptional()
  @IsObject()
  policies!: Partial<Record<Permission, Policy[]>>;
}
