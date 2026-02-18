import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /progress/.../view (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let studentToken: string;
  let courseId: string;
  let lessonId: string;
  let blockId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const studentRole = await fixtures.createRole({
      name: "student_view",
      permissions: [Permission.ENROLLMENTS_READ],
    });

    const user = await fixtures.createUser({
      login: "viewer_student",
      password: "Password123!",
      roleId: studentRole.id,
    });
    studentToken = await fixtures.login("viewer_student", "Password123!");

    const course = await fixtures.createCourse({ title: "Video Course" });
    const lesson = await fixtures.createLesson({ courseId: course.id, title: "Intro" });
    const block = await fixtures.createBlock({
      lessonId: lesson.id,
      type: "video",
      content: { url: "http://..." },
    });

    courseId = course.id;
    lessonId = lesson.id;
    blockId = block.id;

    const cohort = await fixtures.createCohort({
      courseId,
      instructorId: (await fixtures.createInstructor()).id,
      name: "C1",
    });
    await fixtures.enrollStudentWithProgress({ userId: user.id, cohortId: cohort.id, courseId });
    await new Promise(r => setTimeout(r, 500));
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should mark block as viewed and return score 100", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .post(`/progress/${courseId}/lessons/${lessonId}/blocks/${blockId}/view`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "completed", score: 100 });
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.post(`/progress/${courseId}/lessons/${lessonId}/blocks/${blockId}/view`);
    expect(res.status).toBe(401);
  });
});
