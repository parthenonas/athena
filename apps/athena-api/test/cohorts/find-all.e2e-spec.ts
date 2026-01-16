import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { ReadCohortDto } from "../../src/learning/cohort/dto/read.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /cohorts (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let instructorAToken: string;
  let instructorBToken: string;

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
      name: "instructor_role",
      permissions: [Permission.COHORTS_READ],
      policies: {
        [Permission.COHORTS_READ]: [Policy.OWN_ONLY],
      },
    });

    const userA = await fixtures.createUser({
      login: "inst_a",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    instructorAToken = await fixtures.login("inst_a", "Password123!");

    const profileA = await fixtures.createInstructor({
      ownerId: userA.id,
      title: "Instructor A",
    });

    const userB = await fixtures.createUser({
      login: "inst_b",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    instructorBToken = await fixtures.login("inst_b", "Password123!");

    const profileB = await fixtures.createInstructor({
      ownerId: userB.id,
      title: "Instructor B",
    });

    const course = await fixtures.createCourse({ title: "test" });

    const c1 = await fixtures.createCohort({
      name: "Cohort Alpha",
      courseId: course.id,
      instructorId: profileA.id,
    });
    cohortA_Id = c1.id;

    const c2 = await fixtures.createCohort({
      name: "Cohort Beta",
      courseId: course.id,
      instructorId: profileB.id,
    });
    cohortB_Id = c2.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return ALL cohorts for Admin (No Policies applied)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/cohorts").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data: ReadCohortDto[] = res.body.data;

    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(data.find(c => c.id === cohortA_Id)).toBeDefined();
    expect(data.find(c => c.id === cohortB_Id)).toBeDefined();
  });

  it("should return ONLY own cohorts for Instructor A (OWN_ONLY policy)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/cohorts").set("Authorization", `Bearer ${instructorAToken}`);

    expect(res.status).toBe(200);
    const data: ReadCohortDto[] = res.body.data;

    expect(data.length).toBe(1);
    expect(data[0].id).toBe(cohortA_Id);
    expect(data.find(c => c.id === cohortB_Id)).toBeUndefined();
  });

  it("should return ONLY own cohorts for Instructor B (OWN_ONLY policy)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/cohorts").set("Authorization", `Bearer ${instructorBToken}`);

    expect(res.status).toBe(200);
    const data: ReadCohortDto[] = res.body.data;

    expect(data.length).toBe(1);
    expect(data[0].id).toBe(cohortB_Id);
  });

  it("should filter by search query", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/cohorts?search=Alpha").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data: ReadCohortDto[] = res.body.data;

    expect(data.length).toBe(1);
    expect(data[0].name).toContain("Alpha");
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/cohorts");
    expect(res.status).toBe(401);
  });
});
