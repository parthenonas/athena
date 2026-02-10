import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /progress (Dashboard) (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let studentToken: string;
  const courseTitle: string = "Dashboard Course";

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const role = await fixtures.createRole({
      name: "dashboard_user",
      permissions: [Permission.ENROLLMENTS_READ],
    });

    const user = await fixtures.createUser({
      login: "dash_user",
      password: "Password123!",
      roleId: role.id,
    });
    studentToken = await fixtures.login("dash_user", "Password123!");

    const course = await fixtures.createCourse({ title: courseTitle });

    const cohort = await fixtures.createCohort({
      courseId: course.id,
      instructorId: (await fixtures.createInstructor()).id,
      name: "DashCohort",
    });
    await fixtures.enrollStudentWithProgress({ userId: user.id, cohortId: cohort.id, courseId: course.id });

    await new Promise(r => setTimeout(r, 1000));
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return list of courses for dashboard", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/progress").set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const courseData = res.body.find((c: any) => c.courseTitle === courseTitle);
    expect(courseData).toBeDefined();
    expect(courseData).toHaveProperty("progressPercentage");
  });
});
