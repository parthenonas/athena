import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { UpdateScheduleDto } from "../../src/learning/schedule/dto/update.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /schedules/:id (e2e)", () => {
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

    const course = await fixtures.createCourse({ ownerId: admin.id, title: "Course Update" });
    const lesson = await fixtures.createLesson({ courseId: course.id, title: "Lesson Update" });

    const instructorRole = await fixtures.createRole({
      name: "instructor_sched_upd",
      permissions: [Permission.SCHEDULE_UPDATE, Permission.SCHEDULE_READ],
      policies: { [Permission.SCHEDULE_UPDATE]: [Policy.OWN_ONLY] },
    });

    const ownerUser = await fixtures.createUser({
      login: "sched_upd_owner",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    ownerToken = await fixtures.login("sched_upd_owner", "Password123!");

    const ownerProfile = await fixtures.createInstructor({ ownerId: ownerUser.id, title: "Owner Prof" });
    const ownerCohort = await fixtures.createCohort({
      name: "Owner Cohort",
      instructorId: ownerProfile.id,
      courseId: course.id,
    });

    const sched = await fixtures.createSchedule({
      cohortId: ownerCohort.id,
      lessonId: lesson.id,
      isOpenManually: false,
    });
    scheduleId = sched.id;

    const attackerUser = await fixtures.createUser({
      login: "sched_attacker",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    attackerToken = await fixtures.login("sched_attacker", "Password123!");

    await fixtures.createInstructor({ ownerId: attackerUser.id, title: "Attacker Prof" });
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should update OWN schedule (Owner Success)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateScheduleDto = { isOpenManually: true };

    const res = await http.patch(`/schedules/${scheduleId}`).set("Authorization", `Bearer ${ownerToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(scheduleId);
    expect(res.body.isOpenManually).toBe(true);
  });

  it("should update ANY schedule as Admin (Bypass Policy)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateScheduleDto = { isOpenManually: false };

    const res = await http.patch(`/schedules/${scheduleId}`).set("Authorization", `Bearer ${adminToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.isOpenManually).toBe(false);
  });

  it("should DENY updating someone else's schedule (Security Check)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateScheduleDto = { isOpenManually: true };

    const res = await http.patch(`/schedules/${scheduleId}`).set("Authorization", `Bearer ${attackerToken}`).send(dto);

    expect(res.status).toBe(403);
  });

  it("should return 400 for invalid data", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .patch(`/schedules/${scheduleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ startAt: "NOT_A_DATE_BRO" });

    expect(res.status).toBe(400);
  });

  it("should return 404 if schedule does not exist", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http
      .patch(`/schedules/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isOpenManually: true });

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.patch(`/schedules/${scheduleId}`).send({});
    expect(res.status).toBe(401);
  });
});
