import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /accounts/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let adminToken: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const { adminToken: token } = await fixtures.seedAdmin({
      permissions: [Permission.ACCOUNTS_DELETE],
    });
    adminToken = token;
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should delete target user", async () => {
    const http = request(app.getHttpServer());

    const role = await fixtures.createRole({
      name: "user",
      permissions: [],
    });

    const user = await fixtures.createUser({
      login: "del_target",
      password: "Password123!",
      roleId: role.id,
    });

    const res = await http.delete(`/accounts/${user.id}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const failLogin = await http.post("/accounts/login").send({
      login: "del_target",
      password: "Password123!",
    });

    expect(failLogin.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/accounts/whatever`);
    expect(res.status).toBe(401);
  });

  it("should return 403 without ACCOUNTS_DELETE", async () => {
    const role = await fixtures.createRole({
      name: "user_without_permissions",
      permissions: [],
    });

    const login = "user_without_permissions";
    const password = "Password123!";

    const user = await fixtures.createUser({ login, password, roleId: role.id });

    const token = await fixtures.login(login, password);
    const http = request(app.getHttpServer());

    const res = await http.delete(`/accounts/${user.id}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should delete target user with ACCOUNTS_DELETE", async () => {
    const role = await fixtures.createRole({
      name: "user_with_permissions",
      permissions: [Permission.ACCOUNTS_DELETE],
    });

    const login = "user_with_permissions";
    const password = "Password123!";

    const user = await fixtures.createUser({ login, password, roleId: role.id });

    const token = await fixtures.login(login, password);
    const http = request(app.getHttpServer());

    const res = await http.delete(`/accounts/${user.id}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const failLogin = await http.post("/accounts/login").send({
      login: "del_target_2",
      password: "Password123!",
    });

    expect(failLogin.status).toBe(404);
  });

  it("should return 404 for non-existing uuid", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .delete("/accounts/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 400 for invalid uuid", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete("/accounts/not-a-uuid").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});
