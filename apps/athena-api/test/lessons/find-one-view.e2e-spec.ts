import { BlockRequiredAction, BlockType, Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /lessons/:id/view (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let intruderToken: string;

  let ownerId: string;
  let lessonId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin({ password: "Password123!" });
    adminToken = token;

    const ownerRole = await fixtures.createRole({
      name: "view_owner",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.OWN_ONLY] },
    });
    const owner = await fixtures.createUser({
      login: "view_owner",
      password: "Password123!",
      roleId: ownerRole.id,
    });
    ownerId = owner.id;
    ownerToken = await fixtures.login(owner.login, "Password123!");

    const intruderRole = await fixtures.createRole({
      name: "view_intruder",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.OWN_ONLY] },
    });
    const intruder = await fixtures.createUser({
      login: "view_intruder",
      password: "Password123!",
      roleId: intruderRole.id,
    });
    intruderToken = await fixtures.login(intruder.login, "Password123!");

    const course = await fixtures.createCourse({ title: "View Course", ownerId });
    const lesson = await fixtures.createLesson({ title: "View Lesson", courseId: course.id });
    lessonId = lesson.id;

    await fixtures.createLessonView({
      lessonId: lesson.id,
      courseId: course.id,
      title: "View Lesson",
      blocks: [
        {
          blockId: "block-1",
          type: BlockType.Text,
          orderIndex: 1024,
          requiredAction: BlockRequiredAction.VIEW,
          content: { json: { text: "Hello" } },
        },
      ],
    });
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should allow ADMIN to read the lesson view", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/lessons/${lessonId}/view`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.lessonId).toBe(lessonId);
    expect(res.body.blocks).toHaveLength(1);
    expect(res.body.blocks[0].content.json.text).toBe("Hello");
  });

  it("should allow OWNER to read their own lesson view", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/lessons/${lessonId}/view`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.lessonId).toBe(lessonId);
  });

  it("should DENY INTRUDER from reading someone else's lesson view", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/lessons/${lessonId}/view`).set("Authorization", `Bearer ${intruderToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 if lesson does not exist in Postgres", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .get(`/lessons/00000000-0000-0000-0000-000000000000/view`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/lessons/${lessonId}/view`);

    expect(res.status).toBe(401);
  });
});
