import { Permission, BlockType, QuizQuestionType, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /blocks/library/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let ownerToken: string;
  let ownerId: string;
  let myTemplateId: string;
  let otherTemplateId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const role = await fixtures.createRole({
      name: "lib_updater",
      permissions: [Permission.LESSONS_UPDATE, Permission.LESSONS_READ],
      policies: {
        [Permission.LESSONS_READ]: [Policy.OWN_ONLY],
        [Permission.LESSONS_UPDATE]: [Policy.OWN_ONLY],
      },
    });

    const userA = await fixtures.createUser({ login: "owner", password: "Password123!", roleId: role.id });
    ownerId = userA.id;
    ownerToken = await fixtures.login(userA.login, "Password123!");

    const userB = await fixtures.createUser({ login: "hacker", password: "Password123!", roleId: role.id });
    await fixtures.login(userB.login, "Password123!");

    const t1 = await fixtures.createLibraryBlock({
      ownerId: ownerId,
      type: BlockType.Text,
      tags: ["old-tag"],
      content: { json: { text: "Old content" } },
    });
    myTemplateId = t1.id;

    const t2 = await fixtures.createLibraryBlock({
      ownerId: userB.id,
      content: { json: { text: "Hacker's stuff" } },
    });
    otherTemplateId = t2.id;
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should update tags and text content successfully", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/blocks/library/${myTemplateId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        tags: ["new-tag", "sql"],
        content: { json: { text: "Updated content" } },
      });

    expect(res.status).toBe(200);
    expect(res.body.tags).toContain("sql");
    expect(res.body.content.json.text).toBe("Updated content");
  });

  it("should change block type and validate new polymorphic content", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/blocks/library/${myTemplateId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        type: BlockType.QuizQuestion,
        content: {
          question: { json: { text: "What is 2+2?" } },
          type: QuizQuestionType.Open,
          correctAnswerText: "4",
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe(BlockType.QuizQuestion);
  });

  it("should return 400 if updating to an invalid content schema", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/blocks/library/${myTemplateId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        type: BlockType.Code,
        content: { garbage: "data" },
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid content for block type code");
  });

  it("should return 403 if trying to update someone else's template", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/blocks/library/${otherTemplateId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ tags: ["defaced"] });

    expect(res.status).toBe(403);
  });

  it("should return 403 or 404 for non-existent id (depending on AclGuard)", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/blocks/library/${uuid()}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ tags: ["lost"] });

    expect([403, 404]).toContain(res.status);
  });
});
