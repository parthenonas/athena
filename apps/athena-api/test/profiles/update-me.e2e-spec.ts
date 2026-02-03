import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("Profile /me Routes (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let fullAccessUserToken: string;
  let readOnlyUserToken: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const fullRole = await fixtures.createRole({
      name: "profile_full",
      permissions: [Permission.PROFILES_READ, Permission.PROFILES_CREATE, Permission.PROFILES_UPDATE],
    });

    const user1 = await fixtures.createUser({
      login: "full_access",
      password: "Password123!",
      roleId: fullRole.id,
    });
    fullAccessUserToken = await fixtures.login("full_access", "Password123!");

    await fixtures.createProfile({
      ownerId: user1.id,
      firstName: "Original",
      lastName: "Made",
    });

    const readRole = await fixtures.createRole({
      name: "profile_read",
      permissions: [Permission.PROFILES_READ],
    });

    const user2 = await fixtures.createUser({
      login: "read_only",
      password: "Password123!",
      roleId: readRole.id,
    });
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

  describe("PATCH /profiles/me", () => {
    it("should update own profile", async () => {
      const updateDto = {
        firstName: "UpdatedSelf",
      };

      const res = await request(app.getHttpServer())
        .patch("/profiles/me")
        .set("Authorization", `Bearer ${fullAccessUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(res.body.firstName).toBe("UpdatedSelf");
      expect(res.body.lastName).toBe("Made");
    });

    it("should return 404 if profile not found to update", async () => {
      const role = await fixtures.createRole({ name: "updater", permissions: [Permission.PROFILES_UPDATE] });
      await fixtures.createUser({ login: "ghost", password: "Password12345!", roleId: role.id });
      const token = await fixtures.login("ghost", "Password12345!");

      await request(app.getHttpServer())
        .patch("/profiles/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ firstName: "Ghost" })
        .expect(404);
    });

    it("should return 403 without PROFILES_UPDATE permission", async () => {
      await request(app.getHttpServer())
        .patch("/profiles/me")
        .set("Authorization", `Bearer ${readOnlyUserToken}`)
        .send({ firstName: "Hacker" })
        .expect(403);
    });
  });
});
