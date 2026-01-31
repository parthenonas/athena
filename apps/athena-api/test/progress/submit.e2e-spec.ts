import { Permission, ProgrammingLanguage } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { StudentSubmissionDto } from "../../src/learning/progress/application/dto/student-submission.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /progress/.../submit (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let studentToken: string;
  let courseId: string;
  let lessonId: string;
  let blockId: string;

  const mockSubmission: StudentSubmissionDto = {
    code: "console.log('Hello E2E')",
    language: ProgrammingLanguage.Python,
    socketId: "socket-test-1",
  };

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const studentRole = await fixtures.createRole({
      name: "student",
      permissions: [Permission.ENROLLMENTS_READ],
    });

    const user = await fixtures.createUser({
      login: "progress_student",
      password: "Password123!",
      roleId: studentRole.id,
    });
    studentToken = await fixtures.login("progress_student", "Password123!");

    const course = await fixtures.createCourse({ title: "JS Course" });
    const lesson = await fixtures.createLesson({ courseId: course.id, title: "Basics" });
    const block = await fixtures.createBlock({
      lessonId: lesson.id,
      type: "code",
      content: { task: "Write logs" },
    });

    courseId = course.id;
    lessonId = lesson.id;
    blockId = block.id;

    const cohort = await fixtures.createCohort({
      courseId,
      instructorId: (await fixtures.createInstructor()).id,
      name: "C1",
    });
    await fixtures.createEnrollment({ cohortId: cohort.id, accountId: user.id });

    await new Promise(r => setTimeout(r, 500));
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should accept submission and return pending status", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .post(`/progress/${courseId}/lessons/${lessonId}/blocks/${blockId}/submit`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send(mockSubmission);

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: "pending" });
  });

  it("should return 400 for invalid payload", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .post(`/progress/${courseId}/lessons/${lessonId}/blocks/${blockId}/submit`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        code: "",
        language: "unknown",
      });

    expect(res.status).toBe(400);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .post(`/progress/${courseId}/lessons/${lessonId}/blocks/${blockId}/submit`)
      .send(mockSubmission);

    expect(res.status).toBe(401);
  });
});
