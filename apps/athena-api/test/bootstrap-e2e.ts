import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { DataSource } from "typeorm";

import { TestFixtures } from "./fixtures";
import { startTestPostgres, stopTestPostgres } from "./test-postgres";
import { AppModule } from "../src/app.module";
import { ContentService } from "../src/content";
import { IdentityService } from "../src/identity";

export async function bootstrapE2E() {
  await startTestPostgres();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.use(cookieParser());

  await app.init();

  const dataSource = moduleRef.get(DataSource);

  await dataSource.runMigrations();

  const fixtures = new TestFixtures(app, dataSource, moduleRef.get(IdentityService), moduleRef.get(ContentService));

  await fixtures.resetDatabase();

  return { app, dataSource, fixtures };
}

export async function shutdownE2E(app: INestApplication) {
  await app.close();
  await stopTestPostgres();
}
