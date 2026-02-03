import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("Profile Targeted Routes (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let userToken: string;
  let userId: string;
  let otherUserId: string;

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
    userToken = await fixtures.login("targeted_user", "Password123!");

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
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  describe("GET /profiles/:ownerId", () => {
    it("Admin should get any profile", async () => {
      const res = await request(app.getHttpServer())
        .get(`/profiles/${userId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.ownerId).toBe(userId);
      expect(res.body.firstName).toBe("Targeted");
    });

    it("User should get own profile (OWN_ONLY policy check)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/profiles/${userId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.ownerId).toBe(userId);
    });

    it("User should NOT get other profile (OWN_ONLY restriction)", async () => {
      await request(app.getHttpServer())
        .get(`/profiles/${otherUserId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
