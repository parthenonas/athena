import { TokenResponse } from "@athena/types";

/**
 * @class TokenResponseDto
 * Returned after successful authentication.
 *
 * Contains:
 * - short-lived access token (JWT)
 */
export class TokenResponseDto implements TokenResponse {
  /** Signed JWT access token. */
  accessToken!: string;
}
