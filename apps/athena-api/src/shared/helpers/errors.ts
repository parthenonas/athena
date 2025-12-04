import { PostgresQueryError } from "@athena/types";

export function isPostgresQueryError(error: unknown): error is PostgresQueryError {
  return typeof error === "object" && error !== null && "code" in error && "constraint" in error;
}
