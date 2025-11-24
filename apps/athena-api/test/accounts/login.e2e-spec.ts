import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /accounts/login (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  const login: string = "admin";
  const password: string = "admin";

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.seedAdmin({ login, password });
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should login", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/accounts/login").send({
      login,
      password,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/i);
    expect(res.headers["set-cookie"][0]).toMatch(/Max-Age=/i);
  });

  it("should reject wrong password", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/accounts/login").send({
      login,
      password: "wrong",
    });

    expect(res.status).toBe(404);
  });

  it("should reject wrong username", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/accounts/login").send({
      login: "wrong",
      password: "wrong",
    });

    expect(res.status).toBe(404);
  });

  it("should return 400 for invalid dto", async () => {
    const res = await request(app.getHttpServer()).post("/accounts/login").send({
      login: 123,
      password: null,
    });

    expect(res.status).toBe(400);
  });
});
