import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /accounts (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let adminToken: string;
  let userRoleId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const role = await fixtures.createRole({
      name: "user",
      permissions: [],
    });

    userRoleId = role.id;
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should create account (admin)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/accounts").set("Authorization", `Bearer ${adminToken}`).send({
      login: "newuser",
      password: "12345678",
      roleId: userRoleId,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("login", "newuser");

    const token = await fixtures.login("newuser", "12345678");
    expect(typeof token).toBe("string");
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.post("/accounts").send({
      login: "someone",
      password: "12345678",
      roleId: userRoleId,
    });

    expect(res.status).toBe(401);
  });

  it("should return 403 without ACCOUNTS_CREATE", async () => {
    const noPermRole = await fixtures.createRole({
      name: "user_without_permissions",
      permissions: [],
    });

    const login = "user_without_permissions";
    const password = "12345678";

    await fixtures.createUser({
      login,
      password,
      roleId: noPermRole.id,
    });

    const token = await fixtures.login(login, password);

    const http = request(app.getHttpServer());
    const res = await http.post("/accounts").set("Authorization", `Bearer ${token}`).send({
      login: "hehehe",
      password: "12345678",
      roleId: userRoleId,
    });

    expect(res.status).toBe(403);
  });

  it("should return 201 with ACCOUNTS_CREATE", async () => {
    const noPermRole = await fixtures.createRole({
      name: "user_with_permissions",
      permissions: [Permission.ACCOUNTS_CREATE],
    });

    const login = "user_with_permissions";
    const password = "12345678";

    await fixtures.createUser({
      login,
      password,
      roleId: noPermRole.id,
    });

    const token = await fixtures.login(login, password);

    const http = request(app.getHttpServer());
    const res = await http.post("/accounts").set("Authorization", `Bearer ${token}`).send({
      login: "hehehe",
      password: "12345678",
      roleId: userRoleId,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  it("should return 400 when validation fails (short password)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/accounts").set("Authorization", `Bearer ${adminToken}`).send({
      login: "good_login",
      password: "123",
      roleId: userRoleId,
    });

    expect(res.status).toBe(400);
  });

  it("should return 400 when login missing", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/accounts").set("Authorization", `Bearer ${adminToken}`).send({
      password: "12345678",
      roleId: userRoleId,
    });

    expect(res.status).toBe(400);
  });

  it("should return 400 when roleId is not UUID", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/accounts").set("Authorization", `Bearer ${adminToken}`).send({
      login: "wrongrole",
      password: "12345678",
      roleId: "not-uuid",
    });

    expect(res.status).toBe(400);
  });

  it("should return 400 when roleId does not exist", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/accounts").set("Authorization", `Bearer ${adminToken}`).send({
      login: "ghostrole",
      password: "12345678",
      roleId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });

    expect(res.status).toBe(400);
  });

  it("should return 409 when login already exists", async () => {
    const http = request(app.getHttpServer());

    await fixtures.createUser({
      login: "dupe",
      password: "12345678",
      roleId: userRoleId,
    });

    const res = await http.post("/accounts").set("Authorization", `Bearer ${adminToken}`).send({
      login: "dupe",
      password: "12345678",
      roleId: userRoleId,
    });

    expect(res.status).toBe(409);
  });
});
