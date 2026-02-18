import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /accounts/refresh (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  const login: string = "admin";
  const password: string = "Admin123!";

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.seedAdmin({ login, password });
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should refresh", async () => {
    const http = request.agent(app.getHttpServer());

    await http.post("/accounts/login").send({
      login,
      password,
    });

    const res = await http.get("/accounts/refresh").send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
  });

  it("should reject without cookie", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/accounts/refresh").send();

    expect(res.status).toBe(400);
  });
});
