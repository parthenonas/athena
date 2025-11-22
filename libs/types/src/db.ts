export interface PostgresQueryError {
  code: string;
  constraint?: string;
  detail?: string;
}
