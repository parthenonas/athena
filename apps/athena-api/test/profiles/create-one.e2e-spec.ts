import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("Profile Targeted Routes (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let userId: string;
  let otherUserId: string;
  let emptyUserId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const adminRole = await fixtures.createRole({
      name: "targeted_admin_role",
      permissions: [Permission.PROFILES_READ, Permission.PROFILES_CREATE, Permission.PROFILES_UPDATE],
    });

    await fixtures.createUser({
      login: "targeted_admin",
      password: "Password123!",
      roleId: adminRole.id,
    });
    adminToken = await fixtures.login("targeted_admin", "Password123!");

    const userRole = await fixtures.createRole({
      name: "targeted_user_role",
      permissions: [Permission.PROFILES_READ, Permission.PROFILES_UPDATE],
      policies: {
        [Permission.PROFILES_READ]: [Policy.OWN_ONLY],
        [Permission.PROFILES_UPDATE]: [Policy.OWN_ONLY],
      },
    });

    const user = await fixtures.createUser({
      login: "targeted_user",
      password: "Password123!",
      roleId: userRole.id,
    });
    userId = user.id;

    await fixtures.createProfile({
      ownerId: userId,
      firstName: "Targeted",
      lastName: "User",
    });

    const otherUser = await fixtures.createUser({
      login: "targeted_other",
      password: "Password123!",
      roleId: userRole.id,
    });
    otherUserId = otherUser.id;
    await fixtures.createProfile({
      ownerId: otherUserId,
      firstName: "Other",
      lastName: "Guy",
    });

    const emptyUser = await fixtures.createUser({
      login: "targeted_empty",
      password: "Password123!",
      roleId: userRole.id,
    });
    emptyUserId = emptyUser.id;
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  describe("POST /profiles/:ownerId", () => {
    it("Admin should create profile for another user", async () => {
      const dto = { firstName: "For", lastName: "Empty" };

      const res = await request(app.getHttpServer())
        .post(`/profiles/${emptyUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(dto)
        .expect(201);

      expect(res.body.ownerId).toBe(emptyUserId);
      expect(res.body.firstName).toBe("For");
    });
  });
});
