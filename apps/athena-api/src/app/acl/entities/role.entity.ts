import { Permission, Policy } from "@athena-lms/shared/types/acl";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";

import { Account } from "../../account";

/**
 * @Entity Role
 * Represents an access-control role within the Athena LMS authorization system.
 */
@Entity("roles")
@Unique("roles__name__uk", ["name"])
export class Role {
  /**
   * Primary UUID identifier for the role.
   */
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "roles__id__pk" })
  id!: string;

  /**
   * Human-readable role name.
   *
   * Examples:
   * - "admin"
   * - "teacher"
   * - "student"
   *
   * Must be unique.
   */
  @Column()
  name!: string;

  /**
   * List of assigned permissions.
   *
   * Defines allowed actions such as:
   * - courses.create
   * - lessons.update
   * - profiles.read
   *
   * Stored as JSONB array of enum values.
   */
  @Column({ type: "jsonb", default: [] })
  permissions!: Permission[];

  /**
   * Policies applied to specific permissions.
   *
   * Example:
   * {
   *   "courses.update": ["own_only"],
   *   "courses.delete": ["not_published"]
   * }
   *
   * Policies impose additional object-level constraints and refine access rules.
   */
  @Column({ type: "jsonb", default: {} })
  policies!: Record<Permission, Policy[]>;

  /**
   * One-to-many relationship:
   * A single role can be assigned to many accounts.
   */
  @OneToMany(() => Account, account => account.role)
  accounts!: Account[];
}
