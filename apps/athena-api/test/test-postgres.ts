import { StartedPostgreSqlContainer, PostgreSqlContainer } from "@testcontainers/postgresql";

let pg: StartedPostgreSqlContainer;

export async function startTestPostgres() {
  pg = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("testdb")
    .withUsername("test")
    .withPassword("test")
    .start();

  process.env.DATABASE_HOST = pg.getHost();
  process.env.DATABASE_PORT = pg.getPort().toString();
  process.env.DATABASE_USERNAME = pg.getUsername();
  process.env.DATABASE_PASSWORD = pg.getPassword();
  process.env.DATABASE_NAME = pg.getDatabase();
  process.env.TEST_E2E = "true";

  process.env.INITIAL_ADMIN_USERNAME = "admin";
  process.env.INITIAL_ADMIN_PASSWORD = "Admin123!";
  process.env.INITIAL_ADMIN_ROLE_NAME = "admin";

  process.env.JWT_ACCESS_SECRET = "test-access";
  process.env.JWT_REFRESH_SECRET = "test-refresh";

  process.env.JWT_ACCESS_TTL_SECONDS = "900";
  process.env.JWT_REFRESH_TTL_SECONDS = "604800";

  return pg;
}

export async function stopTestPostgres() {
  if (pg) await pg.stop();
}
