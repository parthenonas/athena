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
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
  password!: string;
}
