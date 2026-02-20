import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /accounts/me/password (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let token: string;

  const login = "password_changer";
  const oldPassword = "OldPassword123!";

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const role = await fixtures.createRole({ name: "user", permissions: [] });

    await fixtures.createUser({
      login,
      password: oldPassword,
      roleId: role.id,
    });

    token = await fixtures.login(login, oldPassword);
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should change password successfully", async () => {
    const http = request(app.getHttpServer());
    const newPassword = "NewPassword123!";

    await http
      .patch("/accounts/me/password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        oldPassword,
        newPassword,
      })
      .expect(204);

    const failLogin = await http.post("/accounts/login").send({
      login,
      password: oldPassword,
    });
    expect(failLogin.status).toBe(404);

    const successLogin = await http.post("/accounts/login").send({
      login,
      password: newPassword,
    });
    expect(successLogin.status).toBe(201);

    token = successLogin.body.accessToken;
  });

  it("should return 403 if old password is wrong", async () => {
    const http = request(app.getHttpServer());

    await http
      .patch("/accounts/me/password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        oldPassword: "WrongPassword123!",
        newPassword: "AnotherStrong1!",
      })
      .expect(403);
  });

  describe("Password Validation Checks", () => {
    const http = () => request(app.getHttpServer());
    const validOld = "NewPassword123!";

    const testWeakPassword = async (weakPass: string) => {
      const res = await http().patch("/accounts/me/password").set("Authorization", `Bearer ${token}`).send({
        oldPassword: validOld,
        newPassword: weakPass,
      });
      expect(res.status).toBe(400);
    };

    it("should reject too short password (<8)", async () => {
      await testWeakPassword("Ab1!aaa");
    });

    it("should reject password without uppercase", async () => {
      await testWeakPassword("password123!");
    });

    it("should reject password without lowercase", async () => {
      await testWeakPassword("PASSWORD123!");
    });

    it("should reject password without digits", async () => {
      await testWeakPassword("Password!NoNumbers");
    });

    it("should reject password without special chars", async () => {
      await testWeakPassword("Password123NoSpecial");
    });
  });

  it("should return 401 without token", async () => {
    await request(app.getHttpServer())
      .patch("/accounts/me/password")
      .send({ oldPassword: "any", newPassword: "any" })
      .expect(401);
  });
});
