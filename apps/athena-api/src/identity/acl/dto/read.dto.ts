import { Permission } from "@athena/types";
import { Expose } from "class-transformer";

/**
 * @class ReadRoleDto
 * DTO for safely returning role information.
 */
export class ReadRoleDto {
  /** Role UUID. */
  @Expose()
  id!: string;

  /** Unique role name. */
  @Expose()
  name!: string;

  /** List of permissions assigned to this role. */
  @Expose()
  permissions!: Permission[];

  /** Metadata for fine-grained rules. */
  @Expose()
  policies!: Record<string, string[]>;

  /** Timestamp of creation. */
  @Expose()
  createdAt!: Date;

  /** Timestamp of last update. */
  @Expose()
  updatedAt!: Date;
}
