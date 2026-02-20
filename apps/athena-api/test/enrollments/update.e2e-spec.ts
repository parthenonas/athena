import { EnrollmentStatus, Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { UpdateEnrollmentDto } from "../../src/learning/enrollment/dto/update.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /enrollments/:id (e2e)", () => {
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
    const course = await fixtures.createCourse({ title: "test" });

    const instructor = await fixtures.createInstructor({ ownerId: admin.id, title: "Doc" });
    const cohort = await fixtures.createCohort({
      name: "Math",
      courseId: course.id,
      instructorId: instructor.id,
    });

    const studentRole = await fixtures.createRole({
      name: "student_updater",
      permissions: [Permission.ENROLLMENTS_UPDATE, Permission.ENROLLMENTS_READ],
      policies: { [Permission.ENROLLMENTS_UPDATE]: [Policy.OWN_ONLY] },
    });

    const owner = await fixtures.createUser({
      login: "enroll_upd_owner",
      password: "Password123!",
      roleId: studentRole.id,
    });
    ownerToken = await fixtures.login("enroll_upd_owner", "Password123!");

    const enrollment = await fixtures.createEnrollment({
      cohortId: cohort.id,
      ownerId: owner.id,
      status: EnrollmentStatus.Active,
    });
    enrollmentId = enrollment.id;

    await fixtures.createUser({
      login: "enroll_attacker",
      password: "Password123!",
      roleId: studentRole.id,
    });
    attackerToken = await fixtures.login("enroll_attacker", "Password123!");
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should update own enrollment status (Owner Success)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateEnrollmentDto = { status: EnrollmentStatus.Completed };

    const res = await http.patch(`/enrollments/${enrollmentId}`).set("Authorization", `Bearer ${ownerToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(enrollmentId);
    expect(res.body.status).toBe(EnrollmentStatus.Completed);
  });

  it("should update ANY enrollment as Admin (Bypass Policy)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateEnrollmentDto = { status: EnrollmentStatus.Expelled };

    const res = await http.patch(`/enrollments/${enrollmentId}`).set("Authorization", `Bearer ${adminToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(EnrollmentStatus.Expelled);
  });

  it("should DENY updating someone else's enrollment (Security Check)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateEnrollmentDto = { status: EnrollmentStatus.Active };

    const res = await http
      .patch(`/enrollments/${enrollmentId}`)
      .set("Authorization", `Bearer ${attackerToken}`)
      .send(dto);

    expect(res.status).toBe(403);
  });

  it("should return 400 for invalid status enum", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .patch(`/enrollments/${enrollmentId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "INVALID_STATUS" });

    expect(res.status).toBe(400);
  });

  it("should return 404 if enrollment not found", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http
      .patch(`/enrollments/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: EnrollmentStatus.Active });

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.patch(`/enrollments/${enrollmentId}`).send({});
    expect(res.status).toBe(401);
  });
});
