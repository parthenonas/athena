import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /enrollments/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let attackerToken: string;

  let enrollmentId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { admin, adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const instructor = await fixtures.createInstructor({ ownerId: admin.id, title: "Dr." });
    const course = await fixtures.createCourse({ title: "test" });
    const cohort = await fixtures.createCohort({
      name: "Chemistry",
      courseId: course.id,
      instructorId: instructor.id,
    });

    const studentRole = await fixtures.createRole({
      name: "student_one_view",
      permissions: [Permission.ENROLLMENTS_READ],
      policies: { [Permission.ENROLLMENTS_READ]: [Policy.OWN_ONLY] },
    });

    const owner = await fixtures.createUser({
      login: "enroll_owner",
      password: "Password123!",
      roleId: studentRole.id,
    });
    ownerToken = await fixtures.login("enroll_owner", "Password123!");

    const enrollOwner = await fixtures.createEnrollment({
      cohortId: cohort.id,
      ownerId: owner.id,
    });
    enrollmentId = enrollOwner.id;

    const attacker = await fixtures.createUser({
      login: "enroll_attacker",
      password: "Password123!",
      roleId: studentRole.id,
    });
    attackerToken = await fixtures.login("enroll_attacker", "Password123!");

    await fixtures.createEnrollment({
      cohortId: cohort.id,
      ownerId: attacker.id,
    });
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should allow Admin to view ANY enrollment", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/enrollments/${enrollmentId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(enrollmentId);
  });

  it("should allow Student to view THEIR OWN enrollment", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/enrollments/${enrollmentId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(enrollmentId);
  });

  it("should DENY Student viewing someone else's enrollment (Security Check)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/enrollments/${enrollmentId}`).set("Authorization", `Bearer ${attackerToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http.get(`/enrollments/${fakeId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/enrollments/${enrollmentId}`);

    expect(res.status).toBe(401);
  });
});
