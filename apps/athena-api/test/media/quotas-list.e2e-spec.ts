import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /media/quotas (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const role = await fixtures.createRole({ name: "pleb", permissions: [] });
    await fixtures.createUser({ login: "pleb", password: "Qwerty123!", roleId: role.id });
    userToken = await fixtures.login("pleb", "Qwerty123!");
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should list quotas for admin", async () => {
    const res = await request(app.getHttpServer())
      .get("/media/quotas")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should return 403 for regular user", async () => {
    await request(app.getHttpServer()).get("/media/quotas").set("Authorization", `Bearer ${userToken}`).expect(403);
  });
});
