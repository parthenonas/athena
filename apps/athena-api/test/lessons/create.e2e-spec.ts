import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { CreateLessonDto } from "../../src/content/lesson/dto/create.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /lessons (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let creatorToken: string;
  let attackerToken: string;

  let creatorId: string;
  let courseId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin({ password: "Password123!" });
    adminToken = token;

    const creatorRole = await fixtures.createRole({
      name: "l_creator",
      permissions: [Permission.LESSONS_CREATE, Permission.COURSES_READ],
    });
    const creator = await fixtures.createUser({ login: "l_creator", password: "Password123!", roleId: creatorRole.id });
    creatorId = creator.id;
    creatorToken = await fixtures.login(creator.login, "Password123!");

    const attacker = await fixtures.createUser({
      login: "l_attacker",
      password: "Password123!",
      roleId: creatorRole.id,
    });
    attackerToken = await fixtures.login(attacker.login, "Password123!");

    const c1 = await fixtures.createCourse({ title: "Creator Course", ownerId: creatorId });
    courseId = c1.id;

    await fixtures.createLesson({ title: "Existing Lesson", courseId: courseId, order: 1 });
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should create a lesson in OWN course", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateLessonDto = {
      title: "New Lesson",
      courseId: courseId,
    };

    const res = await http.post("/lessons").set("Authorization", `Bearer ${creatorToken}`).send(dto);

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(dto.title);
    expect(res.body.courseId).toBe(courseId);
    expect(res.body.order).toBe(2);
    expect(res.body.isDraft).toBe(true);
  });

  it("should allow setting manual order and goals", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateLessonDto = {
      title: "Manual Order",
      courseId: courseId,
      order: 10,
      goals: "Learn stuff",
      isDraft: false,
    };

    const res = await http.post("/lessons").set("Authorization", `Bearer ${creatorToken}`).send(dto);

    expect(res.status).toBe(201);
    expect(res.body.order).toBe(10);
    expect(res.body.goals).toBe("Learn stuff");
    expect(res.body.isDraft).toBe(false);
  });

  it("should DENY creating lesson in SOMEONE ELSE'S course", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateLessonDto = {
      title: "Hacked Lesson",
      courseId: courseId,
    };

    const res = await http.post("/lessons").set("Authorization", `Bearer ${attackerToken}`).send(dto);

    expect(res.status).toBe(403);
  });

  it("should return 404 if course does not exist", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateLessonDto = {
      title: "Ghost Lesson",
      courseId: uuid(),
    };

    const res = await http.post("/lessons").set("Authorization", `Bearer ${adminToken}`).send(dto);

    expect(res.status).toBe(404);
  });

  it("should return 400 for invalid data", async () => {
    const http = request(app.getHttpServer());
    const dto = { title: "" };

    const res = await http.post("/lessons").set("Authorization", `Bearer ${adminToken}`).send(dto);

    expect(res.status).toBe(400);
  });
});
