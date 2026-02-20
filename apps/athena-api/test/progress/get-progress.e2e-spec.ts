import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /progress/:courseId (Detailed) (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let studentToken: string;
  let courseId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const role = await fixtures.createRole({
      name: "prog_reader",
      permissions: [Permission.ENROLLMENTS_READ],
    });

    const user = await fixtures.createUser({
      login: "prog_user",
      password: "Password123!",
      roleId: role.id,
    });
    studentToken = await fixtures.login("prog_user", "Password123!");

    const course = await fixtures.createCourse({ title: "Deep Dive" });
    courseId = course.id;

    const cohort = await fixtures.createCohort({
      courseId: course.id,
      instructorId: (await fixtures.createInstructor()).id,
      name: "DeepCohort",
    });
    await fixtures.enrollStudentWithProgress({ userId: user.id, cohortId: cohort.id, courseId });

    await new Promise(r => setTimeout(r, 1000));
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return detailed progress for enrolled course", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/progress/${courseId}`).set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("courseId", courseId);
    expect(res.body).toHaveProperty("lessons");
    expect(res.body).toHaveProperty("totalScore");
  });

  it("should return 404 for random/unenrolled course", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http.get(`/progress/${fakeId}`).set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(404);
  });
});
