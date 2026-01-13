import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { ReadScheduleDto } from "../../src/learning/schedule/dto/read.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /schedules (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let instructorAToken: string;
  let instructorBToken: string;

  let scheduleA_Id: string;
  let scheduleB_Id: string;
  let cohortA_Id: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { admin, adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const course = await fixtures.createCourse({ ownerId: admin.id, title: "Gen Ed" });
    const lesson = await fixtures.createLesson({ courseId: course.id, title: "L1" });

    const instructorRole = await fixtures.createRole({
      name: "instructor_schedule_view",
      permissions: [Permission.SCHEDULE_READ],
      policies: { [Permission.SCHEDULE_READ]: [Policy.OWN_ONLY] },
    });

    const userA = await fixtures.createUser({
      login: "inst_sched_a",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    instructorAToken = await fixtures.login("inst_sched_a", "Password123!");
    const profileA = await fixtures.createInstructor({ ownerId: userA.id, title: "Prof A" });

    const cohortA = await fixtures.createCohort({ name: "Cohort A", instructorId: profileA.id });
    cohortA_Id = cohortA.id;

    const schedA = await fixtures.createSchedule({
      cohortId: cohortA.id,
      lessonId: lesson.id,
    });
    scheduleA_Id = schedA.id;

    const userB = await fixtures.createUser({
      login: "inst_sched_b",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    instructorBToken = await fixtures.login("inst_sched_b", "Password123!");
    const profileB = await fixtures.createInstructor({ ownerId: userB.id, title: "Prof B" });

    const cohortB = await fixtures.createCohort({ name: "Cohort B", instructorId: profileB.id });

    const schedB = await fixtures.createSchedule({
      cohortId: cohortB.id,
      lessonId: lesson.id,
    });
    scheduleB_Id = schedB.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return ALL schedules for Admin (No Policies)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/schedules").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data: ReadScheduleDto[] = res.body.data;

    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(data.find(s => s.id === scheduleA_Id)).toBeDefined();
    expect(data.find(s => s.id === scheduleB_Id)).toBeDefined();
  });

  it("should return ONLY own schedules for Instructor A (OWN_ONLY)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/schedules").set("Authorization", `Bearer ${instructorAToken}`);

    expect(res.status).toBe(200);
    const data: ReadScheduleDto[] = res.body.data;

    expect(data.length).toBe(1);
    expect(data[0].id).toBe(scheduleA_Id);
    expect(data.find(s => s.id === scheduleB_Id)).toBeUndefined();
  });

  it("should return ONLY own schedules for Instructor B (OWN_ONLY)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/schedules").set("Authorization", `Bearer ${instructorBToken}`);

    expect(res.status).toBe(200);
    const data: ReadScheduleDto[] = res.body.data;

    expect(data.length).toBe(1);
    expect(data[0].id).toBe(scheduleB_Id);
  });

  it("should filter by cohortId", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/schedules?cohortId=${cohortA_Id}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(scheduleA_Id);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/schedules");
    expect(res.status).toBe(401);
  });
});
