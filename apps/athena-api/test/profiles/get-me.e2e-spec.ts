import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("Profile /me Routes (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let fullAccessUserToken: string;

  let readOnlyUserToken: string;
  let readOnlyUserId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const fullRole = await fixtures.createRole({
      name: "profile_full",
      permissions: [Permission.PROFILES_READ, Permission.PROFILES_CREATE, Permission.PROFILES_UPDATE],
    });

    await fixtures.createUser({
      login: "full_access",
      password: "Password123!",
      roleId: fullRole.id,
    });
    fullAccessUserToken = await fixtures.login("full_access", "Password123!");

    const readRole = await fixtures.createRole({
      name: "profile_read",
      permissions: [Permission.PROFILES_READ],
    });

    const user2 = await fixtures.createUser({
      login: "read_only",
      password: "Password123!",
      roleId: readRole.id,
    });
    readOnlyUserId = user2.id;
    readOnlyUserToken = await fixtures.login("read_only", "Password123!");

    await fixtures.createProfile({
      ownerId: user2.id,
      firstName: "Reader",
      lastName: "Only",
    });
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  describe("GET /profiles/me", () => {
    it("should return 401 without token", async () => {
      await request(app.getHttpServer()).get("/profiles/me").expect(401);
    });

    it("should return 403 without PROFILES_READ permission", async () => {
      const noPermRole = await fixtures.createRole({ name: "no_perm", permissions: [] });
      await fixtures.createUser({ login: "noperm", password: "Password12345!", roleId: noPermRole.id });
      const token = await fixtures.login("noperm", "Password12345!");

      await request(app.getHttpServer()).get("/profiles/me").set("Authorization", `Bearer ${token}`).expect(403);
    });

    it("should return 404 if profile does not exist", async () => {
      await request(app.getHttpServer())
        .get("/profiles/me")
        .set("Authorization", `Bearer ${fullAccessUserToken}`)
        .expect(404);
    });

    it("should return 200 and profile if exists", async () => {
      const res = await request(app.getHttpServer())
        .get("/profiles/me")
        .set("Authorization", `Bearer ${readOnlyUserToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        firstName: "Reader",
        lastName: "Only",
        ownerId: readOnlyUserId,
      });
    });
  });
});
