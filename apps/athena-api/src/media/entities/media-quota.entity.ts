import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * @Entity MediaQuota
 * Defines storage limits based on user roles.
 *
 * This entity belongs strictly to the Media Bounded Context.
 * It maps a `roleName` (string from AccessToken) to a byte limit.
 */
@Entity("media_quotas")
export class MediaQuota {
  /**
   * The role name (e.g., "admin", "student", "teacher").
   * Not a UUID, just a string key to match the AccessToken payload.
   */
  @PrimaryColumn({ name: "role_name" })
  roleName!: string;

  /**
   * Storage limit in bytes.
   */
  @Column({ name: "limit_bytes", type: "bigint" })
  limitBytes!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
