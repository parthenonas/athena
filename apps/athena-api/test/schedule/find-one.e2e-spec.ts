import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /schedules/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let attackerToken: string;

  let scheduleId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { admin, adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const course = await fixtures.createCourse({ ownerId: admin.id, title: "Course 1" });
    const lesson = await fixtures.createLesson({ courseId: course.id, title: "Lesson 1" });

    const instructorRole = await fixtures.createRole({
      name: "instructor_sched_one",
      permissions: [Permission.SCHEDULE_READ],
      policies: { [Permission.SCHEDULE_READ]: [Policy.OWN_ONLY] },
    });

    const ownerUser = await fixtures.createUser({
      login: "sched_owner",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    ownerToken = await fixtures.login("sched_owner", "Password123!");

    const ownerProfile = await fixtures.createInstructor({ ownerId: ownerUser.id, title: "Prof Owner" });
    const ownerCohort = await fixtures.createCohort({
      name: "Owner Cohort",
      instructorId: ownerProfile.id,
      courseId: course.id,
    });

    const sched = await fixtures.createSchedule({
      cohortId: ownerCohort.id,
      lessonId: lesson.id,
    });
    scheduleId = sched.id;

    const attackerUser = await fixtures.createUser({
      login: "sched_attacker",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    attackerToken = await fixtures.login("sched_attacker", "Password123!");

    await fixtures.createInstructor({ ownerId: attackerUser.id, title: "Prof Attacker" });
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should allow Admin to view ANY schedule item", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/schedules/${scheduleId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(scheduleId);
  });

  it("should allow Instructor to view THEIR OWN schedule item", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/schedules/${scheduleId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(scheduleId);
  });

  it("should DENY Instructor viewing someone else's schedule item (Security Check)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/schedules/${scheduleId}`).set("Authorization", `Bearer ${attackerToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http.get(`/schedules/${fakeId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/schedules/${scheduleId}`);

    expect(res.status).toBe(401);
  });
});
