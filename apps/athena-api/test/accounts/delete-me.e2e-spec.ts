import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /accounts/me (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should delete own account", async () => {
    const role = await fixtures.createRole({
      name: "deleter",
      permissions: [Permission.ACCOUNTS_DELETE],
    });

    const login = "delete_me_test";
    const password = "Password123!";

    await fixtures.createUser({
      login,
      password,
      roleId: role.id,
    });

    const token = await fixtures.login(login, password);

    const http = request(app.getHttpServer());

    const res = await http.delete("/accounts/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const failLogin = await http.post("/accounts/login").send({
      login,
      password,
    });

    expect(failLogin.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete("/accounts/me");
    expect(res.status).toBe(401);
  });

  it("should return 403 without ACCOUNTS_DELETE", async () => {
    const role = await fixtures.createRole({
      name: "user_without_permissions",
      permissions: [],
    });

    const login = "user_without_permissions";
    const password = "Password123!";

    await fixtures.createUser({ login, password, roleId: role.id });

    const token = await fixtures.login(login, password);

    const http = request(app.getHttpServer());

    const res = await http.delete("/accounts/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should delete own account with ACCOUNTS_DELETE", async () => {
    const role = await fixtures.createRole({
      name: "user_with_permissions",
      permissions: [Permission.ACCOUNTS_DELETE],
    });

    const login = "user_with_permissions";
    const password = "Password123!";

    await fixtures.createUser({ login, password, roleId: role.id });

    const token = await fixtures.login(login, password);

    const http = request(app.getHttpServer());

    const res = await http.delete("/accounts/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const failLogin = await http.post("/accounts/login").send({
      login,
      password,
    });

    expect(failLogin.status).toBe(404);
  });
});
