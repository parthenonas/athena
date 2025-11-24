import { Permission } from "@athena/types";
import { IsArray, IsEnum } from "class-validator";

export class UpdateRolePermissionsDto {
  /**
   * Full list of permissions to assign to the role.
   */
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions!: Permission[];
}
