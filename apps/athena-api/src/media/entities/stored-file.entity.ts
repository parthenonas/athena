import { FileAccess, Ownable } from "@athena/types";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * @Entity StoredFile
 * Represents a metadata record for a file stored in the S3-compatible storage (MinIO).
 *
 * This entity acts as the Single Source of Truth for file management.
 * It does not store the file content itself, but references the location
 * in the object storage via `bucket` and `key`.
 *
 * ## Bounded Context: Media
 * This entity belongs to the Media context and maintains loose coupling
 * with other contexts (e.g., Identity). It stores references (like `ownerId`)
 * as simple values without database-level Foreign Keys to other modules.
 */
@Entity("media_files")
@Index(["ownerId"])
@Index(["mimeType"])
export class StoredFile implements Ownable {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "media_files__id__pk" })
  id!: string;

  /**
   * The S3 bucket name where the file is physically stored.
   * Determines the base storage container.
   */
  @Column()
  bucket!: string;

  /**
   * The unique key (path) within the bucket.
   * Example: `users/550e8400-e29b/avatars/123.png`
   */
  @Column()
  key!: string;

  /**
   * The original name of the file as uploaded by the user.
   * Used when downloading the file to restore its proper name.
   */
  @Column({ name: "original_name" })
  originalName!: string;

  /**
   * MIME type of the file (e.g., "image/jpeg", "application/pdf").
   * Crucial for setting correct Content-Type headers during streaming.
   */
  @Column({ name: "mime_type" })
  mimeType!: string;

  /**
   * File size in bytes.
   * stored as `bigint` to support large files (videos, archives).
   * Note: TypeORM might return this as a string in JS/TS.
   */
  @Column({ type: "bigint" })
  size!: string;

  /**
   * Determines the visibility and access control strategy.
   * - `Public`: Direct S3 access allowed.
   * - `Private`: Access strictly proxied through the backend with permission checks.
   */
  @Column({ type: "enum", enum: FileAccess, default: FileAccess.Private })
  access!: FileAccess;

  /**
   * UUID of the user who uploaded the file.
   *
   * @note strictly a value object reference.
   * There is no Foreign Key constraint to the `accounts` table
   * to respect the Bounded Context boundaries of the Modular Monolith.
   */
  @Column({ name: "owner_id" })
  ownerId!: string;

  /**
   * Timestamps.
   */
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
