import { Permission, BlockType, QuizQuestionType } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { CreateLibraryBlockDto } from "../../src/content/block/dto/create.library.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /blocks/library (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let creatorToken: string;
  let unauthorizedToken: string;
  let creatorId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    await fixtures.seedAdmin({ password: "Password123!" });

    const creatorRole = await fixtures.createRole({
      name: "lib_creator",
      permissions: [Permission.LESSONS_CREATE, Permission.LESSONS_READ],
    });
    const creator = await fixtures.createUser({
      login: "lib_creator",
      password: "Password123!",
      roleId: creatorRole.id,
    });
    creatorId = creator.id;
    creatorToken = await fixtures.login(creator.login, "Password123!");

    const unauthorizedRole = await fixtures.createRole({
      name: "unauth_lib",
      permissions: [Permission.LESSONS_READ],
    });
    const unauth = await fixtures.createUser({
      login: "lib_unauth",
      password: "Password123!",
      roleId: unauthorizedRole.id,
    });
    unauthorizedToken = await fixtures.login(unauth.login, "Password123!");
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should create a TEXT template in the library", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateLibraryBlockDto = {
      type: BlockType.Text,
      tags: ["theory", "sql"],
      content: { json: { data: "Some theory about SQL" } },
    };

    const res = await http.post("/blocks/library").set("Authorization", `Bearer ${creatorToken}`).send(dto);

    expect(res.status).toBe(201);
    expect(res.body.type).toBe(BlockType.Text);
    expect(res.body.ownerId).toBe(creatorId);
    expect(res.body.tags).toEqual(["theory", "sql"]);
    expect(res.body.content.json.data).toBe("Some theory about SQL");
  });

  it("should allow creating a QUIZ_QUESTION template with valid polymorphic content", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateLibraryBlockDto = {
      type: BlockType.QuizQuestion,
      tags: ["sql", "join", "hard"],
      content: {
        type: QuizQuestionType.Single,
        question: { json: { text: "What is INNER JOIN?" } },
        options: [
          { id: uuid(), text: "Intersection", isCorrect: true },
          { id: uuid(), text: "Union", isCorrect: false },
        ],
        explanation: "Because it matches records in both tables.",
      },
    };

    const res = await http.post("/blocks/library").set("Authorization", `Bearer ${creatorToken}`).send(dto);

    expect(res.status).toBe(201);
    expect(res.body.type).toBe(BlockType.QuizQuestion);
    expect(res.body.tags).toContain("hard");
    expect(res.body.content.options.length).toBe(2);
  });

  it("should return 403 if user lacks LESSONS_CREATE permission", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateLibraryBlockDto = {
      type: BlockType.Text,
      tags: ["hack"],
      content: { json: { data: "Should be denied" } },
    };

    const res = await http.post("/blocks/library").set("Authorization", `Bearer ${unauthorizedToken}`).send(dto);

    expect(res.status).toBe(403);
  });

  it("should return 400 for missing tags array", async () => {
    const http = request(app.getHttpServer());
    const dto = {
      type: BlockType.Text,
      content: { json: {} },
    };

    const res = await http.post("/blocks/library").set("Authorization", `Bearer ${creatorToken}`).send(dto);

    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(expect.arrayContaining(["tags should not be empty"]));
  });

  it("should return 400 for INVALID POLYMORPHIC CONTENT (Quiz missing question)", async () => {
    const http = request(app.getHttpServer());
    const dto: CreateLibraryBlockDto = {
      type: BlockType.QuizQuestion,
      tags: ["test"],
      content: {
        type: QuizQuestionType.Single,
        options: [],
      } as any,
    };

    const res = await http.post("/blocks/library").set("Authorization", `Bearer ${creatorToken}`).send(dto);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid content for block type quiz_question");
  });
});
