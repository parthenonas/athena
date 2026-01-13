import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { UpdateCohortDto } from "../../src/learning/cohort/dto/update.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /cohorts/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let attackerToken: string;

  let cohortId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const instructorRole = await fixtures.createRole({
      name: "instructor_updater",
      permissions: [Permission.COHORTS_UPDATE, Permission.COHORTS_READ],
      policies: { [Permission.COHORTS_UPDATE]: [Policy.OWN_ONLY] },
    });

    const ownerUser = await fixtures.createUser({
      login: "cohort_owner",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    ownerToken = await fixtures.login("cohort_owner", "Password123!");

    const ownerProfile = await fixtures.createInstructor({
      ownerId: ownerUser.id,
      title: "Owner Instructor",
    });

    const attackerUser = await fixtures.createUser({
      login: "cohort_attacker",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    attackerToken = await fixtures.login("cohort_attacker", "Password123!");

    await fixtures.createInstructor({
      ownerId: attackerUser.id,
      title: "Attacker Instructor",
    });

    const cohort = await fixtures.createCohort({
      name: "Original Name",
      instructorId: ownerProfile.id,
      startDate: new Date(),
    });
    cohortId = cohort.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should update own cohort (Owner Success)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateCohortDto = { name: "Updated by Owner" };

    const res = await http.patch(`/cohorts/${cohortId}`).set("Authorization", `Bearer ${ownerToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(cohortId);
    expect(res.body.name).toBe("Updated by Owner");
  });

  it("should update ANY cohort as Admin (Bypass Policy)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateCohortDto = { name: "Updated by Admin" };

    const res = await http.patch(`/cohorts/${cohortId}`).set("Authorization", `Bearer ${adminToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated by Admin");
  });

  it("should DENY updating someone else's cohort (Security Check)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateCohortDto = { name: "Hacked Name" };

    const res = await http.patch(`/cohorts/${cohortId}`).set("Authorization", `Bearer ${attackerToken}`).send(dto);

    expect(res.status).toBe(403);
  });

  it("should return 400 for invalid data", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .patch(`/cohorts/${cohortId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  it("should return 404 if cohort does not exist", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http
      .patch(`/cohorts/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.patch(`/cohorts/${cohortId}`).send({ name: "New" });

    expect(res.status).toBe(401);
  });
});
