import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

/**
 * @class UpdateAccountDto
 * DTO for updating an existing account.
 *
 * All fields are optional:
 * - If login is changed, uniqueness is validated
 * - If password is provided, it will be re-hashed
 * - If roleId changes, the account will be reassigned to another role
 */
export class UpdateAccountDto {
  /** New login (optional). Must be unique. */
  @IsOptional()
  @IsString()
  @MinLength(3)
  login?: string;

  /** New plain password (optional). Gets re-hashed. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  /** New role to assign to the account. */
  @IsOptional()
  @IsUUID()
  roleId?: string;
}
