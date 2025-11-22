import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /accounts/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let adminToken: string;
  let adminId: string;

  let userRoleId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const { adminToken: token, admin } = await fixtures.seedAdmin();
    adminToken = token;
    adminId = admin.id;

    const role = await fixtures.createRole({
      name: "user",
      permissions: [],
    });

    userRoleId = role.id;
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should update login", async () => {
    const http = request(app.getHttpServer());

    const user = await fixtures.createUser({
      login: "updateme",
      password: "12345678",
      roleId: userRoleId,
    });

    const res = await http
      .patch(`/accounts/${user.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ login: "updated_login" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("login", "updated_login");
  });

  it("should update password (and hash it)", async () => {
    const http = request(app.getHttpServer());

    const user = await fixtures.createUser({
      login: "userpass",
      password: "12345678",
      roleId: userRoleId,
    });

    const res = await http
      .patch(`/accounts/${user.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ password: "87654321" });

    expect(res.status).toBe(200);

    const token = await fixtures.login("userpass", "87654321");
    expect(typeof token).toBe("string");
  });

  it("should update roleId", async () => {
    const http = request(app.getHttpServer());

    const newRole = await fixtures.createRole({
      name: "another_role",
      permissions: [],
    });

    const user = await fixtures.createUser({
      login: "changerole",
      password: "12345678",
      roleId: userRoleId,
    });

    const res = await http
      .patch(`/accounts/${user.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roleId: newRole.id });

    expect(res.status).toBe(200);
    expect(res.body.roleId).toBe(newRole.id);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());

    const res = await http.patch(`/accounts/${adminId}`).send({
      login: "no_token",
    });

    expect(res.status).toBe(401);
  });

  it("should return 403 without ACCOUNTS_UPDATE", async () => {
    const role = await fixtures.createRole({
      name: "user_without_permissions",
      permissions: [],
    });

    const login = "user_without_permissions";
    const password = "12345678";

    await fixtures.createUser({
      login,
      password,
      roleId: role.id,
    });

    const token = await fixtures.login(login, password);

    const http = request(app.getHttpServer());
    const res = await http.patch(`/accounts/${adminId}`).set("Authorization", `Bearer ${token}`).send({ login: "x" });

    expect(res.status).toBe(403);
  });

  it("should return 200 with ACCOUNTS_UPDATE", async () => {
    const role = await fixtures.createRole({
      name: "user_with_permissions",
      permissions: [Permission.ACCOUNTS_UPDATE],
    });

    const login = "user_with_permissions";
    const password = "12345678";
    const updatedLogin = "user_with_permissions_upd";

    await fixtures.createUser({
      login,
      password,
      roleId: role.id,
    });

    const token = await fixtures.login(login, password);

    const http = request(app.getHttpServer());
    const res = await http
      .patch(`/accounts/${adminId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ login: updatedLogin });

    expect(res.status).toBe(200);
    expect(res.body.login).toBe(updatedLogin);
  });

  it("should return 404 if account not found", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .patch(`/accounts/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ login: "whoops" });

    expect(res.status).toBe(404);
  });

  it("should return 400 for invalid UUID", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .patch(`/accounts/not-a-uuid`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ login: "ok" });

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid login (too short)", async () => {
    const http = request(app.getHttpServer());

    const user = await fixtures.createUser({
      login: "aaa2",
      password: "12345678",
      roleId: userRoleId,
    });

    const res = await http
      .patch(`/accounts/${user.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ login: "x" });

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid password", async () => {
    const http = request(app.getHttpServer());

    const user = await fixtures.createUser({
      login: "aaas3",
      password: "12345678",
      roleId: userRoleId,
    });

    const res = await http
      .patch(`/accounts/${user.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ password: "123" });

    expect(res.status).toBe(400);
  });

  it("should return 400 when updating to non-existing role", async () => {
    const http = request(app.getHttpServer());

    const user = await fixtures.createUser({
      login: "nonexistrole",
      password: "12345678",
      roleId: userRoleId,
    });

    const res = await http.patch(`/accounts/${user.id}`).set("Authorization", `Bearer ${adminToken}`).send({
      roleId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });

    expect(res.status).toBe(400);
  });

  it("should return 409 when updating login to existing one", async () => {
    const http = request(app.getHttpServer());

    await fixtures.createUser({
      login: "duplicatelogin",
      password: "12345678",
      roleId: userRoleId,
    });

    const user = await fixtures.createUser({
      login: "changingit",
      password: "12345678",
      roleId: userRoleId,
    });

    const res = await http.patch(`/accounts/${user.id}`).set("Authorization", `Bearer ${adminToken}`).send({
      login: "duplicatelogin",
    });

    expect(res.status).toBe(409);
  });
});
