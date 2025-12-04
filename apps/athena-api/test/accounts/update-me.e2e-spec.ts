import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /accounts/me (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const role = await fixtures.createRole({
      name: "user_update",
      permissions: [Permission.ACCOUNTS_UPDATE],
    });

    const login = "me_update_user";
    const password = "12345678";
    const user = await fixtures.createUser({
      login,
      password,
      roleId: role.id,
    });

    userId = user.id;
    userToken = await fixtures.login(login, password);
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should update own login", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .patch("/accounts/me")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ login: "updated_my_login" });

    expect(res.status).toBe(200);
    expect(res.body.login).toBe("updated_my_login");
  });

  it("should update own password and allow login with new one", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .patch("/accounts/me")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ password: "newpassword123" });

    expect(res.status).toBe(200);

    const newToken = await fixtures.login(res.body.login, "newpassword123");
    expect(typeof newToken).toBe("string");
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());

    const res = await http.patch("/accounts/me").send({ login: "x" });
    expect(res.status).toBe(401);
  });

  it("should return 403 without ACCOUNTS_UPDATE permission", async () => {
    const role = await fixtures.createRole({
      name: "user_without_permissions",
      permissions: [],
    });

    const login = "user_without_permissions";
    const password = "12345678";
    const updatedLogin = "user_without_permissions_upd";

    await fixtures.createUser({
      login,
      password,
      roleId: role.id,
    });

    const token = await fixtures.login(login, password);

    const http = request(app.getHttpServer());
    const res = await http.patch("/accounts/me").set("Authorization", `Bearer ${token}`).send({ login: updatedLogin });

    expect(res.status).toBe(403);
  });

  it("should return 200 with ACCOUNTS_UPDATE permission", async () => {
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
    const res = await http.patch("/accounts/me").set("Authorization", `Bearer ${token}`).send({ login: updatedLogin });

    expect(res.status).toBe(200);
    expect(res.body.login).toBe(updatedLogin);
  });

  it("should return 400 for short login", async () => {
    const http = request(app.getHttpServer());

    const res = await http.patch("/accounts/me").set("Authorization", `Bearer ${userToken}`).send({ login: "x" });

    expect(res.status).toBe(400);
  });

  it("should return 400 for short password", async () => {
    const http = request(app.getHttpServer());

    const res = await http.patch("/accounts/me").set("Authorization", `Bearer ${userToken}`).send({ password: "123" });

    expect(res.status).toBe(400);
  });

  it("should ignore provided id in body (user cannot change someone else)", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .patch("/accounts/me")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", login: "still_me" });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
  });
});
