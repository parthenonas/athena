import { IsString, MinLength } from "class-validator";

/**
 * @class LoginDto
 * Input DTO for login/authentication requests.
 */
export class LoginDto {
  /** Account login. */
  @IsString()
  login!: string;

  /** Plain password. Must meet minimal complexity. */
  @IsString()
  @MinLength(4)
  password!: string;
}
