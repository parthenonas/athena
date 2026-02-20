import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { ReadEnrollmentDto } from "../../src/learning/enrollment/dto/read.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /enrollments (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let studentAToken: string;
  let studentBToken: string;

  let enrollmentA_Id: string;
  let enrollmentB_Id: string;
  let cohortId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { admin, adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const instructor = await fixtures.createInstructor({ ownerId: admin.id, title: "Prof" });
    const course = await fixtures.createCourse({ title: "test" });
    const cohort = await fixtures.createCohort({
      name: "Physics 101",
      courseId: course.id,
      instructorId: instructor.id,
    });
    cohortId = cohort.id;

    const studentRole = await fixtures.createRole({
      name: "student_restricted",
      permissions: [Permission.ENROLLMENTS_READ],
      policies: { [Permission.ENROLLMENTS_READ]: [Policy.OWN_ONLY] },
    });

    const userA = await fixtures.createUser({
      login: "student_a",
      password: "Password123!",
      roleId: studentRole.id,
    });
    studentAToken = await fixtures.login("student_a", "Password123!");

    const enrollA = await fixtures.createEnrollment({
      cohortId: cohort.id,
      ownerId: userA.id,
    });
    enrollmentA_Id = enrollA.id;

    const userB = await fixtures.createUser({
      login: "student_b",
      password: "Password123!",
      roleId: studentRole.id,
    });
    studentBToken = await fixtures.login("student_b", "Password123!");

    const enrollB = await fixtures.createEnrollment({
      cohortId: cohort.id,
      ownerId: userB.id,
    });
    enrollmentB_Id = enrollB.id;
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return ALL enrollments for Admin (No Policies applied)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/enrollments").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data: ReadEnrollmentDto[] = res.body.data;

    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(data.find(e => e.id === enrollmentA_Id)).toBeDefined();
    expect(data.find(e => e.id === enrollmentB_Id)).toBeDefined();
  });

  it("should return ONLY own enrollments for Student A (OWN_ONLY policy)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/enrollments").set("Authorization", `Bearer ${studentAToken}`);

    expect(res.status).toBe(200);
    const data: ReadEnrollmentDto[] = res.body.data;

    expect(data.length).toBe(1);
    expect(data[0].id).toBe(enrollmentA_Id);
    expect(data.find(e => e.id === enrollmentB_Id)).toBeUndefined();
  });

  it("should return ONLY own enrollments for Student B (OWN_ONLY policy)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/enrollments").set("Authorization", `Bearer ${studentBToken}`);

    expect(res.status).toBe(200);
    const data: ReadEnrollmentDto[] = res.body.data;

    expect(data.length).toBe(1);
    expect(data[0].id).toBe(enrollmentB_Id);
  });

  it("should filter by cohortId", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/enrollments?cohortId=${cohortId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/enrollments");

    expect(res.status).toBe(401);
  });
});
