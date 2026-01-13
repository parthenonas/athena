import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { CreateScheduleDto } from "../../src/learning/schedule/dto/create.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

const mockCreateDto: CreateScheduleDto = {
  cohortId: "",
  lessonId: "",
};

describe("POST /schedules (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let managerToken: string;
  let cohortId: string;
  let lessonId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const { admin } = await fixtures.seedAdmin();

    const course = await fixtures.createCourse({ ownerId: admin.id, title: "Math Course" });
    const lesson = await fixtures.createLesson({ courseId: course.id, title: "Algebra 1" });
    lessonId = lesson.id;

    const instructor = await fixtures.createInstructor({ ownerId: admin.id, title: "Math Prof" });
    const cohort = await fixtures.createCohort({
      name: "Math Cohort 1",
      instructorId: instructor.id,
    });
    cohortId = cohort.id;

    const managerRole = await fixtures.createRole({
      name: "scheduler",
      permissions: [Permission.SCHEDULE_CREATE],
    });
    await fixtures.createUser({
      login: "scheduler_user",
      password: "Password123!",
      roleId: managerRole.id,
    });
    managerToken = await fixtures.login("scheduler_user", "Password123!");

    mockCreateDto.cohortId = cohortId;
    mockCreateDto.lessonId = lessonId;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should successfully create schedule item (Manager Access)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/schedules").set("Authorization", `Bearer ${managerToken}`).send(mockCreateDto);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.cohortId).toBe(cohortId);
    expect(res.body.lessonId).toBe(lessonId);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.post("/schedules").send(mockCreateDto);

    expect(res.status).toBe(401);
  });

  it("should return 403 without SCHEDULE_CREATE permission", async () => {
    const noPermRole = await fixtures.createRole({ name: "viewer", permissions: [] });
    await fixtures.createUser({
      login: "no_schedule_perm",
      password: "Password123!",
      roleId: noPermRole.id,
    });
    const token = await fixtures.login("no_schedule_perm", "Password123!");

    const http = request(app.getHttpServer());
    const res = await http.post("/schedules").set("Authorization", `Bearer ${token}`).send(mockCreateDto);

    expect(res.status).toBe(403);
  });

  it("should return 400 when validation fails (missing lessonId)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/schedules").set("Authorization", `Bearer ${managerToken}`).send({
      cohortId: cohortId,
      startDate: new Date().toISOString(),
    });

    expect(res.status).toBe(400);
  });

  it("should fail (400/500) if cohort/lesson does not exist", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http
      .post("/schedules")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        ...mockCreateDto,
        cohortId: fakeId,
      });

    expect(res.status).not.toBe(201);
  });
});
