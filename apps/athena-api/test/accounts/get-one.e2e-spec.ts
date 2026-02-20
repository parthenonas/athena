import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /accounts/:id (e2e)", () => {
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

  it("should get account by id", async () => {
    const http = request(app.getHttpServer());

    const { id } = await fixtures.createRole({ name: "user" });

    const user = await fixtures.createUser({
      login: "john",
      password: "Password123!",
      roleId: id,
    });

    const res = await http.get(`/accounts/${user.id}`).set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", user.id);
  });

  it("should return 403 without permissions", async () => {
    const http = request(app.getHttpServer());

    const { id } = await fixtures.createRole({ name: "user_without_permissions" });

    const login = "user_without_permissions";
    const password = "Password123!";
    const user = await fixtures.createUser({ login, password, roleId: id });

    const token = await fixtures.login(login, password);

    const res = await http.get(`/accounts/${user.id}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should return 200 with ACCOUNTS_READ permission", async () => {
    const http = request(app.getHttpServer());

    const { id } = await fixtures.createRole({
      name: "user_with_permissions",
      permissions: [Permission.ACCOUNTS_READ],
    });

    const login = "user_with_permissions";
    const password = "Password123!";
    const user = await fixtures.createUser({ login, password, roleId: id });

    const token = await fixtures.login(login, password);

    const res = await http.get(`/accounts/${user.id}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", user.id);
  });

  it("should return 401 without Authorization header", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/accounts/any-id");

    expect(res.status).toBe(401);
  });

  it("should return 401 for invalid JWT", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/accounts/any").set("Authorization", "Bearer INVALID.JWT.TOKEN");

    expect(res.status).toBe(401);
  });

  it("should return 404 if account does not exist", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .get("/accounts/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});
