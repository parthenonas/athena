import { PASSWORD_REGEX } from "@athena/common";
import { LoginRequest } from "@athena/types";
import { IsString, Matches } from "class-validator";

/**
 * @class LoginDto
 * Input DTO for login/authentication requests.
 */
export class LoginDto implements LoginRequest {
  /** Account login. */
  @IsString()
  login!: string;

  /** Plain password. Must meet minimal complexity. */
  @IsString()
  @Matches(PASSWORD_REGEX)
  password!: string;
}
