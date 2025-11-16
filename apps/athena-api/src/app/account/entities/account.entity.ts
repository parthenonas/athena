import { Status } from "@athena-lms/shared";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

import { Role } from "../../acl/entities/role.entity";
import { ProfileRecord } from "../../profile-record/entities/profile-record.entity";

/**
 * @Entity Account
 * Represents a system account for authentication and access control.
 * Personal data is stored as dynamic key-value records (ProfileRecord).
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
   * One-to-many relationship to profile records.
   */
  @OneToMany(() => ProfileRecord, record => record.account, {
    cascade: true,
  })
  profileRecords!: ProfileRecord[];

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
