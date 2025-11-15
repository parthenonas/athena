/**
 * PostgreSQL SQLSTATE error codes.
 *
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 *
 * These constants help avoid "magic numbers" while handling database errors.
 * Use them when mapping low-level PG errors to domain-specific HTTP exceptions.
 */
export const PostgresErrorCode = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  NOT_NULL_VIOLATION: "23502",
  CHECK_VIOLATION: "23514",
  EXCLUSION_VIOLATION: "23P01",
} as const;

export type PostgresErrorCode = (typeof PostgresErrorCode)[keyof typeof PostgresErrorCode];
