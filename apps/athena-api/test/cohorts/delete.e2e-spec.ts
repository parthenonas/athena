import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /cohorts/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let attackerToken: string;

  let ownerInstructorId: string;
  let cohortId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const deleterRole = await fixtures.createRole({
      name: "cohort_deleter",
      permissions: [Permission.COHORTS_DELETE, Permission.COHORTS_READ],
      policies: { [Permission.COHORTS_DELETE]: [Policy.OWN_ONLY] },
    });

    const ownerUser = await fixtures.createUser({
      login: "owner_del",
      password: "Password123!",
      roleId: deleterRole.id,
    });
    ownerToken = await fixtures.login("owner_del", "Password123!");

    const ownerProfile = await fixtures.createInstructor({
      ownerId: ownerUser.id,
      title: "Owner Instructor",
    });
    ownerInstructorId = ownerProfile.id;

    const attackerUser = await fixtures.createUser({
      login: "attacker_del",
      password: "Password123!",
      roleId: deleterRole.id,
    });
    attackerToken = await fixtures.login("attacker_del", "Password123!");

    await fixtures.createInstructor({
      ownerId: attackerUser.id,
      title: "Attacker Instructor",
    });

    const cohort = await fixtures.createCohort({
      name: "To Be Deleted",
      instructorId: ownerProfile.id,
    });
    cohortId = cohort.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should DENY deleting someone else's cohort (Security Check)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/cohorts/${cohortId}`).set("Authorization", `Bearer ${attackerToken}`);

    expect(res.status).toBe(403);
  });

  it("should delete own cohort (Owner Success)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/cohorts/${cohortId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(204);

    const checkRes = await http.get(`/cohorts/${cohortId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(checkRes.status).toBe(404);
  });

  it("should allow Admin to delete ANY cohort (Bypass Policy)", async () => {
    const http = request(app.getHttpServer());

    const newCohort = await fixtures.createCohort({
      name: "Admin Target",
      instructorId: ownerInstructorId,
    });

    const res = await http.delete(`/cohorts/${newCohort.id}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("should return 404 if cohort does not exist", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http.delete(`/cohorts/${fakeId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.delete(`/cohorts/${cohortId}`);
    expect(res.status).toBe(401);
  });
});
