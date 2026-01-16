import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /schedules/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let attackerToken: string;

  let scheduleId: string;
  let cohortId: string;
  let lessonId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { admin, adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const course = await fixtures.createCourse({ ownerId: admin.id, title: "Course Del" });
    const lesson = await fixtures.createLesson({ courseId: course.id, title: "Lesson Del" });
    lessonId = lesson.id;

    const deleterRole = await fixtures.createRole({
      name: "instructor_sched_del",
      permissions: [Permission.SCHEDULE_DELETE, Permission.SCHEDULE_READ],
      policies: { [Permission.SCHEDULE_DELETE]: [Policy.OWN_ONLY] },
    });

    const ownerUser = await fixtures.createUser({
      login: "sched_del_owner",
      password: "Password123!",
      roleId: deleterRole.id,
    });
    ownerToken = await fixtures.login("sched_del_owner", "Password123!");

    const ownerProfile = await fixtures.createInstructor({ ownerId: ownerUser.id, title: "Owner Prof" });
    const ownerCohort = await fixtures.createCohort({
      name: "Owner Cohort",
      instructorId: ownerProfile.id,
      courseId: course.id,
    });
    cohortId = ownerCohort.id;

    const sched = await fixtures.createSchedule({
      cohortId: ownerCohort.id,
      lessonId: lesson.id,
    });
    scheduleId = sched.id;

    const attackerUser = await fixtures.createUser({
      login: "sched_attacker",
      password: "Password123!",
      roleId: deleterRole.id,
    });
    attackerToken = await fixtures.login("sched_attacker", "Password123!");

    await fixtures.createInstructor({ ownerId: attackerUser.id, title: "Attacker Prof" });
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should DENY deleting someone else's schedule (Security Check)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/schedules/${scheduleId}`).set("Authorization", `Bearer ${attackerToken}`);

    expect(res.status).toBe(403);
  });

  it("should delete OWN schedule (Owner Success)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/schedules/${scheduleId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(204);

    const checkRes = await http.get(`/schedules/${scheduleId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(checkRes.status).toBe(404);
  });

  it("should allow Admin to delete ANY schedule (Bypass Policy)", async () => {
    const http = request(app.getHttpServer());

    const newSched = await fixtures.createSchedule({
      cohortId: cohortId,
      lessonId: lessonId,
    });

    const res = await http.delete(`/schedules/${newSched.id}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("should return 404 if schedule does not exist", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http.delete(`/schedules/${fakeId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.delete(`/schedules/${scheduleId}`);
    expect(res.status).toBe(401);
  });
});
