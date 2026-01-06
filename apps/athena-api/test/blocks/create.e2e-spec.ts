import { Permission, ProgrammingLanguage, BlockType, CodeExecutionMode } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { CreateBlockDto } from "../../src/content/block/dto/create.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /blocks (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let creatorToken: string;
  let unauthorizedToken: string;

  let creatorId: string;
  let creatorLessonId: string;
  let otherLessonId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin({ password: "Password123!" });
    adminToken = token;

    const creatorRole = await fixtures.createRole({
      name: "b_creator",
      permissions: [Permission.LESSONS_UPDATE, Permission.LESSONS_READ],
    });
    const creator = await fixtures.createUser({ login: "b_creator", password: "Password123!", roleId: creatorRole.id });
    creatorId = creator.id;
    creatorToken = await fixtures.login(creator.login, "Password123!");

    const attacker = await fixtures.createUser({
      login: "b_attacker",
      password: "Password123!",
      roleId: creatorRole.id,
    });

    const unauthorizedRole = await fixtures.createRole({
      name: "unauth_block",
      permissions: [Permission.LESSONS_READ],
    });
    const unauth = await fixtures.createUser({
      login: "b_unauth",
      password: "Password123!",
      roleId: unauthorizedRole.id,
    });
    unauthorizedToken = await fixtures.login(unauth.login, "Password123!");

    const c1 = await fixtures.createCourse({ title: "Creator Course", ownerId: creatorId });
    const c2 = await fixtures.createCourse({ title: "Other Course", ownerId: attacker.id });

    const l1 = await fixtures.createLesson({ title: "My Lesson", courseId: c1.id });
    creatorLessonId = l1.id;

    const l2 = await fixtures.createLesson({ title: "Other Lesson", courseId: c2.id });
    otherLessonId = l2.id;

    await fixtures.createBlock({ lessonId: creatorLessonId, type: BlockType.Text, orderIndex: 1024 });
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should create a TEXT block in OWN lesson with AUTO-ORDER (1024 + 1024)", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateBlockDto = {
      lessonId: creatorLessonId,
      type: BlockType.Text,
      content: { json: { data: "Some Tiptap content" } },
    };

    const res = await http.post("/blocks").set("Authorization", `Bearer ${creatorToken}`).send(dto);

    expect(res.status).toBe(201);
    expect(res.body.lessonId).toBe(creatorLessonId);
    expect(res.body.type).toBe(BlockType.Text);
    expect(res.body.orderIndex).toBe(2048);
  });

  it("should allow creating a CODE block with VALID polymorphic content", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateBlockDto = {
      lessonId: creatorLessonId,
      type: BlockType.Code,
      content: {
        language: ProgrammingLanguage.Python,
        initialCode: "print('Hello')",
        executionMode: CodeExecutionMode.IoCheck,
        taskText: { json: {} },
      },
      orderIndex: 500,
    };

    const res = await http.post("/blocks").set("Authorization", `Bearer ${creatorToken}`).send(dto);

    expect(res.status).toBe(201);
    expect(res.body.type).toBe(BlockType.Code);
    expect(res.body.orderIndex).toBe(500);
    expect(res.body.content.language).toBe(ProgrammingLanguage.Python);
  });

  it("should return 403 if user lacks LESSONS_UPDATE permission", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateBlockDto = {
      lessonId: creatorLessonId,
      type: BlockType.Text,
      content: { json: { data: "Should be denied" } },
    };

    const res = await http.post("/blocks").set("Authorization", `Bearer ${unauthorizedToken}`).send(dto);

    expect(res.status).toBe(403);
  });

  it("should DENY creating block in SOMEONE ELSE'S lesson (Service ACL)", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateBlockDto = {
      lessonId: otherLessonId,
      type: BlockType.Text,
      content: { json: { data: "Hacked attempt" } },
    };

    const res = await http.post("/blocks").set("Authorization", `Bearer ${creatorToken}`).send(dto);

    expect(res.status).toBe(403);
  });

  it("should return 404 if lesson does not exist", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateBlockDto = {
      lessonId: uuid(),
      type: BlockType.Text,
      content: { json: { data: "Ghost" } },
    };

    const res = await http.post("/blocks").set("Authorization", `Bearer ${adminToken}`).send(dto);

    expect(res.status).toBe(404);
  });

  it("should return 400 for invalid DTO data (Missing lessonId)", async () => {
    const http = request(app.getHttpServer());
    const dto = { type: BlockType.Text, content: {} };

    const res = await http.post("/blocks").set("Authorization", `Bearer ${adminToken}`).send(dto);

    expect(res.status).toBe(400);
  });

  it("should return 400 for INVALID POLYMORPHIC CONTENT (Code missing initialCode)", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateBlockDto = {
      lessonId: creatorLessonId,
      type: BlockType.Code,
      content: {
        language: ProgrammingLanguage.Python,
      } as any,
    };

    const res = await http.post("/blocks").set("Authorization", `Bearer ${creatorToken}`).send(dto);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid content for block type code");
  });
});
