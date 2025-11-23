import { IsString, IsUUID, MinLength } from "class-validator";

/**
 * @class CreateAccountDto
 * DTO for creating a new account via the admin panel.
 *
 * - `login` must be unique
 * - `password` is provided in plain text and will be hashed in the service
 * - `roleId` links the account to an existing Role entity
 */
export class CreateAccountDto {
  /** New account login (unique). */
  @IsString()
  @MinLength(3)
  login!: string;

  /** Plain-text password (hashed before saving). */
  @IsString()
  @MinLength(8)
  password!: string;

  /** UUID of the role to assign to this account. */
  @IsUUID()
  roleId?: string;
}
