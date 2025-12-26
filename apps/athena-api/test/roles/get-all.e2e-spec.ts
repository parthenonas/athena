import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /roles (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let adminToken: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should return list of roles", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/roles").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty("meta");
  });

  it("should reject without token (401)", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/roles");

    expect(res.status).toBe(401);
  });

  it("should reject without Permission.ADMIN (403)", async () => {
    const http = request(app.getHttpServer());

    const role = await fixtures.createRole({
      name: "role_without_admin",
      permissions: [],
    });

    const login = "no_admin_user";
    const password = "Password123!";

    await fixtures.createUser({ login, password, roleId: role.id });
    const token = await fixtures.login(login, password);

    const res = await http.get("/roles").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should support pagination", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/roles?page=1&limit=2").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("meta");

    expect(Array.isArray(res.body.data)).toBe(true);

    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(2);
    expect(res.body.meta.pages).toBeGreaterThan(0);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });
});
