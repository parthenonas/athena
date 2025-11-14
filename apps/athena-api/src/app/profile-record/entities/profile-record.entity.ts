import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Account } from "../../account";

/**
 * @Entity ProfileRecord
 * Dynamic key-value storage for user profile data.
 * Allows adding arbitrary fields without schema migrations.
 */
@Entity("profile_records")
@Index("profile_records__account_name__idx", ["account", "name"], { unique: true })
export class ProfileRecord {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "profile_records__id__pk" })
  id!: string;

  /**
   * Associated account identifier.
   * Stored as a UUID string without foreign key constraint.
   */
  @ManyToOne(() => Account, account => account.profileRecords)
  @JoinColumn({ name: "account_id", foreignKeyConstraintName: "profile_records__account_id__fk" })
  account!: Account;

  /**
   * Name of the field (e.g. "first_name", "city", "degree").
   */
  @Column()
  name!: string;

  /**
   * Stringified value (text, number, date as string).
   */
  @Column("text")
  value!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
