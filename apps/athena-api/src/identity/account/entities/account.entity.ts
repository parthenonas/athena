import { Status } from "@athena/types";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

import { Role } from "../../acl/entities/role.entity";
import { Profile } from "../../profile/entities/profile.entity";

/**
 * @Entity Account
 * Represents a system account for authentication and access control.
 */
@Entity("accounts")
@Unique("accounts__login__uk", ["login"])
export class Account {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "accounts__id__pk" })
  id!: string;

  /**
   * Unique login for authentication.
   */
  @Column()
  login!: string;

  /**
   * Hashed password.
   * Never expose or return this field in DTOs.
   */
  @Column({ name: "password_hash" })
  passwordHash!: string;

  /**
   * System role.
   */
  @ManyToOne(() => Role, role => role.accounts)
  @JoinColumn({ name: "role_id", foreignKeyConstraintName: "accounts__role_id__fk" })
  role!: Role;

  /**
   * System role id.
   */
  @Column({ name: "role_id" })
  roleId!: string;

  /**
   * Account status
   */
  @Column({ type: "varchar", enum: Status, default: Status.Active })
  status!: Status;

  /**
   * One-to-one relationship to profile.
   */
  @OneToOne(() => Profile, profile => profile.owner)
  profile?: Profile;

  /**
   * Timestamps.
   */
  @CreateDateColumn({ name: "created_at" })
  readonly createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  readonly updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt!: Date | null;
}
