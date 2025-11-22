/**
 * @class TokenResponseDto
 * Returned after successful authentication.
 *
 * Contains:
 * - short-lived access token (JWT)
 */
export class TokenResponseDto {
  /** Signed JWT access token. */
  accessToken!: string;
}
