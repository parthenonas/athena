import { Permission, Policy, BlockType } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { ReorderBlockDto } from "../../src/content/block/dto/update.dto";
import { Block } from "../../src/content/block/entities/block.entity";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /blocks/:id/reorder (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let restrictedUpdateToken: string;

  let creatorId: string;
  let blockToMoveId: string;
  let blockPubOtherId: string;

  const reorderPayload: ReorderBlockDto = {
    newOrderIndex: 1536.5,
  };

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin({ password: "Password123!" });
    adminToken = token;

    const ownerRole = await fixtures.createRole({
      name: "b_reorder_owner",
      permissions: [Permission.LESSONS_READ, Permission.LESSONS_UPDATE],
      policies: { [Permission.LESSONS_UPDATE]: [Policy.OWN_ONLY] },
    });
    const ownerUser = await fixtures.createUser({
      login: "b_reorder_owner",
      password: "Password123!",
      roleId: ownerRole.id,
    });
    creatorId = ownerUser.id;
    ownerToken = await fixtures.login(ownerUser.login, "Password123!");

    const restrictedUpdateRole = await fixtures.createRole({
      name: "b_reorder_restricted",
      permissions: [Permission.LESSONS_UPDATE],
      policies: { [Permission.LESSONS_UPDATE]: [Policy.OWN_ONLY] },
    });
    const restrictedUser = await fixtures.createUser({
      login: "b_reorder_restricted_guy",
      password: "Password123!",
      roleId: restrictedUpdateRole.id,
    });
    restrictedUpdateToken = await fixtures.login(restrictedUser.login, "Password123!");

    const otherUser = await fixtures.createUser({
      login: "b_reorder_other",
      password: "Password123!",
      roleId: ownerRole.id,
    });

    const c1 = await fixtures.createCourse({ title: "C1 Reorder", ownerId: creatorId, isPublished: true });
    const l1 = await fixtures.createLesson({ title: "L1 Reorder", courseId: c1.id });

    const b1: Block = await fixtures.createBlock({
      lessonId: l1.id,
      type: BlockType.Text,
      orderIndex: 3072,
    });
    blockToMoveId = b1.id;

    const c2 = await fixtures.createCourse({ title: "C2 Other", ownerId: otherUser.id, isPublished: true });
    const l2 = await fixtures.createLesson({ title: "L2 Other", courseId: c2.id });
    const b2: Block = await fixtures.createBlock({
      lessonId: l2.id,
      type: BlockType.Text,
      orderIndex: 1024,
    });
    blockPubOtherId = b2.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should allow OWNER to reorder their own block using float index", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .patch(`/blocks/${blockToMoveId}/reorder`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(reorderPayload);

    expect(res.status).toBe(200);
    expect(res.body.orderIndex).toBe(reorderPayload.newOrderIndex);
  });

  it("should allow ADMIN to reorder any block", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .patch(`/blocks/${blockPubOtherId}/reorder`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ newOrderIndex: 100.5 });

    expect(res.status).toBe(200);
    expect(res.body.orderIndex).toBe(100.5);
  });

  it("should DENY RESTRICTED user (OWN_ONLY) reorder access to block in ANOTHER user's course", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .patch(`/blocks/${blockPubOtherId}/reorder`)
      .set("Authorization", `Bearer ${restrictedUpdateToken}`)
      .send(reorderPayload);

    expect(res.status).toBe(403);
  });

  it("should return 404 if block does not exist", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .patch(`/blocks/${uuid()}/reorder`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(reorderPayload);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.patch(`/blocks/${blockToMoveId}/reorder`).send(reorderPayload);

    expect(res.status).toBe(401);
  });
});
