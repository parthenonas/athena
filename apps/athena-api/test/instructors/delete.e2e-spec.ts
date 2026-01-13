import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /instructors/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let attackerToken: string;

  let instructorId: string;
  let ownerUserId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const deleterRole = await fixtures.createRole({
      name: "instructor_deleter",
      permissions: [Permission.INSTRUCTORS_DELETE, Permission.INSTRUCTORS_READ],
      policies: { [Permission.INSTRUCTORS_DELETE]: [Policy.OWN_ONLY] },
    });

    const ownerUser = await fixtures.createUser({
      login: "inst_del_owner",
      password: "Password123!",
      roleId: deleterRole.id,
    });
    ownerToken = await fixtures.login("inst_del_owner", "Password123!");
    ownerUserId = ownerUser.id;

    const profile = await fixtures.createInstructor({
      ownerId: ownerUser.id,
      title: "To Be Deleted",
    });
    instructorId = profile.id;

    const attackerUser = await fixtures.createUser({
      login: "inst_attacker",
      password: "Password123!",
      roleId: deleterRole.id,
    });
    attackerToken = await fixtures.login("inst_attacker", "Password123!");

    await fixtures.createInstructor({
      ownerId: attackerUser.id,
      title: "Attacker",
    });
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should DENY deleting someone else's profile (Security Check)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/instructors/${instructorId}`).set("Authorization", `Bearer ${attackerToken}`);

    expect(res.status).toBe(403);
  });

  it("should delete OWN profile (Owner Success)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/instructors/${instructorId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(204);

    const checkRes = await http.get(`/instructors/${instructorId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(checkRes.status).toBe(404);
  });

  it("should allow Admin to delete ANY profile (Bypass Policy)", async () => {
    const http = request(app.getHttpServer());

    const newProfile = await fixtures.createInstructor({
      ownerId: ownerUserId,
      title: "Admin Target",
    });

    const res = await http.delete(`/instructors/${newProfile.id}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("should return 404 if profile does not exist", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http.delete(`/instructors/${fakeId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.delete(`/instructors/${instructorId}`);
    expect(res.status).toBe(401);
  });
});
