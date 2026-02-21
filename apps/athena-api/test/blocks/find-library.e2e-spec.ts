import { Permission, BlockType, ProgrammingLanguage, CodeExecutionMode, QuizQuestionType } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /blocks/library (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let userAToken: string;
  let unauthorizedToken: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const creatorRole = await fixtures.createRole({
      name: "lib_reader",
      permissions: [Permission.LESSONS_READ],
    });

    const userA = await fixtures.createUser({ login: "user_a", password: "Password123!", roleId: creatorRole.id });
    userAToken = await fixtures.login(userA.login, "Password123!");

    const userB = await fixtures.createUser({ login: "user_b", password: "Password123!", roleId: creatorRole.id });
    await fixtures.login(userB.login, "Password123!");

    const unauthRole = await fixtures.createRole({ name: "no_lib", permissions: [] });
    const unauth = await fixtures.createUser({ login: "unauth", password: "Password123!", roleId: unauthRole.id });
    unauthorizedToken = await fixtures.login(unauth.login, "Password123!");

    await fixtures.createLibraryBlock({
      ownerId: userA.id,
      type: BlockType.Text,
      tags: ["sql", "theory"],
      content: { json: { text: "Intro to Relational Databases" } },
    });

    await fixtures.createLibraryBlock({
      ownerId: userA.id,
      type: BlockType.QuizQuestion,
      tags: ["sql", "practice"],
      content: {
        type: QuizQuestionType.Single,
        question: { json: { text: "What does SELECT do?" } },
        options: [{ id: "opt-1", text: "Fetches data", isCorrect: true }],
      },
    });

    await fixtures.createLibraryBlock({
      ownerId: userA.id,
      type: BlockType.Code,
      tags: ["python", "practice"],
      content: {
        language: ProgrammingLanguage.Python,
        taskText: { json: {} },
        executionMode: CodeExecutionMode.IoCheck,
      },
    });

    await fixtures.createLibraryBlock({
      ownerId: userB.id,
      type: BlockType.Text,
      tags: ["sql", "theory"],
      content: { json: { text: "User B SQL Basics" } },
    });
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return ONLY blocks owned by the requester (Isolation)", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/blocks/library").set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(3);

    const hasUserBBlocks = res.body.data.some((b: any) => b.content.json?.text === "User B SQL Basics");

    expect(hasUserBBlocks).toBe(false);
  });

  it("should filter blocks by a SINGLE tag", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/blocks/library?tags=sql").set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
  });

  it("should filter blocks by MULTIPLE tags (Intersection)", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/blocks/library?tags=sql&tags=practice").set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].type).toBe(BlockType.QuizQuestion);
  });

  it("should filter blocks by TYPE", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/blocks/library?type=${BlockType.Code}`).set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].type).toBe(BlockType.Code);
  });

  it("should filter blocks by SEARCH text (ILIKE)", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/blocks/library?search=Relational").set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].content.json.text).toBe("Intro to Relational Databases");
  });

  it("should apply PAGINATION limits correctly", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/blocks/library?limit=2&page=1").set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.limit).toBe(2);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.pages).toBe(2);
  });

  it("should return 403 if user lacks LESSONS_READ permission", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/blocks/library").set("Authorization", `Bearer ${unauthorizedToken}`);

    expect(res.status).toBe(403);
  });
});
