import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /cohorts/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let instructorAToken: string;

  let cohortA_Id: string;
  let cohortB_Id: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const instructorRole = await fixtures.createRole({
      name: "instructor_limited",
      permissions: [Permission.COHORTS_READ],
      policies: { [Permission.COHORTS_READ]: [Policy.OWN_ONLY] },
    });

    const userA = await fixtures.createUser({
      login: "inst_a",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    instructorAToken = await fixtures.login("inst_a", "Password123!");
    const profileA = await fixtures.createInstructor({
      ownerId: userA.id,
      title: "Prof A",
    });

    const userB = await fixtures.createUser({
      login: "inst_b",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    const profileB = await fixtures.createInstructor({
      ownerId: userB.id,
      title: "Prof B",
    });

    const course = await fixtures.createCourse({ title: "test" });

    const c1 = await fixtures.createCohort({
      name: "Cohort A",
      courseId: course.id,
      instructorId: profileA.id,
    });
    cohortA_Id = c1.id;

    const c2 = await fixtures.createCohort({
      name: "Cohort B",
      courseId: course.id,
      instructorId: profileB.id,
    });
    cohortB_Id = c2.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should allow Admin to view ANY cohort", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/cohorts/${cohortA_Id}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(cohortA_Id);
  });

  it("should allow Instructor A to view THEIR OWN cohort", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/cohorts/${cohortA_Id}`).set("Authorization", `Bearer ${instructorAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(cohortA_Id);
  });

  it("should DENY Instructor A to view Instructor B's cohort (Security Check)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/cohorts/${cohortB_Id}`).set("Authorization", `Bearer ${instructorAToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http.get(`/cohorts/${fakeId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/cohorts/${cohortA_Id}`);

    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no permission", async () => {
    const noPermRole = await fixtures.createRole({ name: "guest", permissions: [] });
    await fixtures.createUser({
      login: "guest",
      password: "Password123!",
      roleId: noPermRole.id,
    });
    const token = await fixtures.login("guest", "Password123!");

    const http = request(app.getHttpServer());
    const res = await http.get(`/cohorts/${cohortA_Id}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
