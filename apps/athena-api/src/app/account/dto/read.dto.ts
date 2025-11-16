import { Status } from "@athena-lms/shared/types/account";
import { Expose } from "class-transformer";

/**
 * @class ReadAccountDto
 * Safe representation of an account entity returned to clients.
 *
 * Contains:
 * - Basic identity fields
 * - Role name
 * - Activity status
 * - Timestamps
 *
 * Does NOT contain sensitive data such as password hashes.
 */
export class ReadAccountDto {
  /** Account UUID. */

  @Expose()
  id!: string;

  /** Account login. */
  @Expose()
  login!: string;

  /** Role name associated with the account. */
  @Expose()
  roleId!: string;

  /** Account status. */
  @Expose()
  status!: Status;

  /** Timestamp of creation. */
  @Expose()
  createdAt!: Date;

  /** Timestamp of last update. */
  @Expose()
  updatedAt!: Date;
}
