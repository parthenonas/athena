import { Permission, UpdateRolePermissionsRequest } from "@athena/types";
import { IsArray, IsEnum } from "class-validator";

export class UpdateRolePermissionsDto implements UpdateRolePermissionsRequest {
  /**
   * Full list of permissions to assign to the role.
   */
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions!: Permission[];
}
