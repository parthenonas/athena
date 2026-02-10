import { MAX_NAME_LENGTH } from "@athena/common";
import { Ownable } from "@athena/types";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Account } from "../../account/entities/account.entity";

/**
 * @Entity Profile
 * Represents the personal information of a user.
 * Linked 1-to-1 with the Account entity.
 *
 * Architecture:
 * - Core fields (names) are explicit columns for indexing/sorting.
 * - Flexible fields are stored in `metadata` (JSONB) to avoid EAV pattern.
 */
@Entity({ name: "profiles" })
export class Profile implements Ownable {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "profiles__id__pk" })
  id!: string;

  /**
   * Reference to the Account (Foreign Key).
   * Unique constraint ensures one profile per account.
   */
  @Column({ name: "owner_id", type: "uuid" })
  ownerId!: string;

  @OneToOne(() => Account, { onDelete: "CASCADE" })
  @JoinColumn({ name: "owner_id", foreignKeyConstraintName: "profiles__owner_id__fk" })
  owner!: Account;

  /**
   * User's first name.
   */
  @Column({ name: "first_name", type: "varchar", length: MAX_NAME_LENGTH })
  firstName!: string;

  /**
   * User's last name.
   */
  @Column({ name: "last_name", type: "varchar", length: MAX_NAME_LENGTH })
  lastName!: string;

  /**
   * User's middle name (optional).
   */
  @Column({ type: "varchar", length: MAX_NAME_LENGTH, nullable: true })
  patronymic?: string | null;

  /**
   * URL to the avatar image (usually stored in S3/MinIO).
   */
  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl?: string | null;

  /**
   * Date of birth.
   */
  @Column({ name: "birth_date", type: "date", nullable: true })
  birthDate?: Date | null;

  /**
   * Flexible storage for additional attributes.
   * Examples: social links, bio, specialized settings.
   * Uses PostgreSQL JSONB for binary storage and indexing capability.
   */
  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;

  /**
   * Timestamps.
   */
  @CreateDateColumn({ name: "created_at" })
  readonly createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  readonly updatedAt!: Date;

  /**
   * Virtual getter for full name.
   * Useful for frontend/logging, not stored in DB.
   */
  get fullName(): string {
    return [this.lastName, this.firstName, this.patronymic].filter(Boolean).join(" ");
  }
}
