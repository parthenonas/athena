import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /accounts/me (e2e)", () => {
  let app: INestApplication;
  let accessToken: string;
  let fixtures: any;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    const { adminToken } = await fixtures.seedAdmin();
    accessToken = adminToken;
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should return current user profile", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/accounts/me").set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty("id");
  });

  it("should return 403 without permissions", async () => {
    const role = await fixtures.createRole({
      name: "user_without_permissions",
      permissions: [],
    });

    const login = "user_without_permissions";
    const password = "123456";
    await fixtures.createUser({ login, password, roleId: role.id });

    const token = await fixtures.login(login, password);

    const http = request(app.getHttpServer());
    const res = await http.get("/accounts/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should return 200 with ACCOUNTS_READ permission", async () => {
    const role = await fixtures.createRole({
      name: "user_with_permissions",
      permissions: [Permission.ACCOUNTS_READ],
    });

    const login = "user_with_permissions";
    const password = "123456";
    const user = await fixtures.createUser({ login, password, roleId: role.id });

    const token = await fixtures.login(login, password);

    const http = request(app.getHttpServer());
    const res = await http.get("/accounts/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", user.id);
  });

  it("should return 401 when no token is provided", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/accounts/me");

    expect(res.status).toBe(401);
  });
});
