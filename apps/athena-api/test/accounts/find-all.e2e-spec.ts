import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /accounts (e2e)", () => {
  let app: INestApplication;
  let accessToken: string;
  let fixtures: any;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    const { adminToken } = await fixtures.seedAdmin();
    accessToken = adminToken;
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should return list of accounts", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/accounts").set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should reject without token (401)", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/accounts");

    expect(res.status).toBe(401);
  });

  it("should reject without permissions", async () => {
    const http = request(app.getHttpServer());

    const role = await fixtures.createRole({
      name: "reader_without_perm",
      permissions: [],
    });

    const login = "reader_no_perm";
    const password = "Password123!";

    await fixtures.createUser({ login, password, roleId: role.id });
    const token = await fixtures.login(login, password);

    const res = await http.get("/accounts").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should allow user with ACCOUNTS_READ permission", async () => {
    const http = request(app.getHttpServer());

    const role = await fixtures.createRole({
      name: "reader_with_perm",
      permissions: [Permission.ACCOUNTS_READ],
    });

    const login = "reader_with_perm";
    const password = "Password123!";

    await fixtures.createUser({ login, password, roleId: role.id });
    const token = await fixtures.login(login, password);

    const res = await http.get("/accounts").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should support pagination", async () => {
    const http = request(app.getHttpServer());

    const page = 1;
    const limit = 2;

    const res = await http.get("/accounts?page=1&limit=2").set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("meta");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThan(0);
    expect(res.body.meta.page).toBe(page);
    expect(res.body.meta.limit).toBe(limit);
    expect(res.body.meta.pages).toBeGreaterThan(0);
  });
});
