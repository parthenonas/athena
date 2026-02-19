import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /enrollments/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let attackerToken: string;

  let cohortId: string;
  let enrollmentId: string;
  let studentId: string;

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
      name: "History",
      courseId: course.id,
      instructorId: instructor.id,
    });
    cohortId = cohort.id;

    const deleterRole = await fixtures.createRole({
      name: "student_deleter",
      permissions: [Permission.ENROLLMENTS_DELETE, Permission.ENROLLMENTS_READ],
      policies: { [Permission.ENROLLMENTS_DELETE]: [Policy.OWN_ONLY] },
    });

    const owner = await fixtures.createUser({
      login: "enroll_del_owner",
      password: "Password123!",
      roleId: deleterRole.id,
    });
    ownerToken = await fixtures.login("enroll_del_owner", "Password123!");
    studentId = owner.id;

    const enrollment = await fixtures.createEnrollment({
      cohortId: cohort.id,
      ownerId: owner.id,
    });
    enrollmentId = enrollment.id;

    await fixtures.createUser({
      login: "enroll_attacker",
      password: "Password123!",
      roleId: deleterRole.id,
    });
    attackerToken = await fixtures.login("enroll_attacker", "Password123!");
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should DENY deleting someone else's enrollment (Security Check)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/enrollments/${enrollmentId}`).set("Authorization", `Bearer ${attackerToken}`);

    expect(res.status).toBe(403);
  });

  it("should delete own enrollment (Owner Success)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/enrollments/${enrollmentId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(204);

    const checkRes = await http.get(`/enrollments/${enrollmentId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(checkRes.status).toBe(404);
  });

  it("should allow Admin to delete ANY enrollment (Bypass Policy)", async () => {
    const http = request(app.getHttpServer());

    const newEnrollment = await fixtures.createEnrollment({
      cohortId: cohortId,
      ownerId: studentId,
    });

    const res = await http.delete(`/enrollments/${newEnrollment.id}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("should return 404 if enrollment does not exist", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http.delete(`/enrollments/${fakeId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.delete(`/enrollments/${enrollmentId}`);
    expect(res.status).toBe(401);
  });
});
