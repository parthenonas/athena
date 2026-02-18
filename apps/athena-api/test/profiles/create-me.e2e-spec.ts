import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("Profile /me Routes (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let fullAccessUserToken: string;
  let fullAccessUserId: string;

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
    fullAccessUserId = user1.id;
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
    readOnlyUserToken = await fixtures.login("read_only", "Password123!");

    await fixtures.createProfile({
      ownerId: user2.id,
      firstName: "Reader",
      lastName: "Only",
    });
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  describe("POST /profiles/me", () => {
    it("should create profile for self", async () => {
      const dto = {
        firstName: "Self",
        lastName: "Made",
        metadata: { theme: "dark" },
      };

      const res = await request(app.getHttpServer())
        .post("/profiles/me")
        .set("Authorization", `Bearer ${fullAccessUserToken}`)
        .send(dto)
        .expect(201);

      expect(res.body).toMatchObject({
        firstName: "Self",
        lastName: "Made",
        ownerId: fullAccessUserId,
        metadata: { theme: "dark" },
      });
    });

    it("should return 400 if validation fails", async () => {
      const dto = {
        firstName: "",
        lastName: "Valid",
      };

      await request(app.getHttpServer())
        .post("/profiles/me")
        .set("Authorization", `Bearer ${fullAccessUserToken}`)
        .send(dto)
        .expect(400);
    });

    it("should return 400 (or 409 depending on logic) if profile already exists", async () => {
      const dto = { firstName: "Dub", lastName: "le" };

      await request(app.getHttpServer())
        .post("/profiles/me")
        .set("Authorization", `Bearer ${fullAccessUserToken}`)
        .send(dto)
        .expect(400);
    });

    it("should return 403 without PROFILES_CREATE permission", async () => {
      const dto = { firstName: "Hacker", lastName: "Man" };

      await request(app.getHttpServer())
        .post("/profiles/me")
        .set("Authorization", `Bearer ${readOnlyUserToken}`)
        .send(dto)
        .expect(403);
    });
  });
});
