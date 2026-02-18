import { Permission, Policy, BlockType } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { Block } from "../../src/content/block/entities/block.entity";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /blocks/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let publicOnlyToken: string;
  let restrictedUpdateToken: string;

  let creatorId: string;

  let updateRestrictedRoleId: string;

  let blockPubOwnerId: string;
  let blockDraftOwnerId: string;
  let blockPubOtherId: string;
  const updatePayload = {
    type: BlockType.Text,
    content: {
      json: {
        text: "updated text",
      },
    },
  };

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin({ password: "Password123!" });
    adminToken = token;

    const ownerRole = await fixtures.createRole({
      name: "b_upd_owner_full",
      permissions: [Permission.LESSONS_READ, Permission.LESSONS_UPDATE],
      policies: { [Permission.LESSONS_UPDATE]: [Policy.OWN_ONLY] },
    });
    const ownerUser = await fixtures.createUser({
      login: "b_upd_owner",
      password: "Password123!",
      roleId: ownerRole.id,
    });
    creatorId = ownerUser.id;
    ownerToken = await fixtures.login(ownerUser.login, "Password123!");

    const publicRole = await fixtures.createRole({
      name: "b_upd_public_read",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.ONLY_PUBLISHED] },
    });
    const publicUser = await fixtures.createUser({
      login: "b_upd_public",
      password: "Password123!",
      roleId: publicRole.id,
    });
    publicOnlyToken = await fixtures.login(publicUser.login, "Password123!");

    const restrictedUpdateRole = await fixtures.createRole({
      name: "b_upd_restricted",
      permissions: [Permission.LESSONS_UPDATE],
      policies: { [Permission.LESSONS_UPDATE]: [Policy.OWN_ONLY] },
    });
    updateRestrictedRoleId = restrictedUpdateRole.id;
    const restrictedUser = await fixtures.createUser({
      login: "b_upd_restricted_guy",
      password: "Password123!",
      roleId: updateRestrictedRoleId,
    });
    restrictedUpdateToken = await fixtures.login(restrictedUser.login, "Password123!");

    const otherUser = await fixtures.createUser({
      login: "b_upd_other",
      password: "Password123!",
      roleId: ownerRole.id,
    });

    const c1 = await fixtures.createCourse({ title: "C1 Pub", ownerId: creatorId, isPublished: true });
    const l1 = await fixtures.createLesson({ title: "L1 Pub", courseId: c1.id });
    const b1: Block = await fixtures.createBlock({
      lessonId: l1.id,
      type: BlockType.Text,
      content: {
        json: { text: "Original Public content" },
      },
    });
    blockPubOwnerId = b1.id;

    const c2 = await fixtures.createCourse({ title: "C2 Draft", ownerId: creatorId, isPublished: false });
    const l2 = await fixtures.createLesson({ title: "L2 Draft", courseId: c2.id });
    const b2: Block = await fixtures.createBlock({
      lessonId: l2.id,
      type: BlockType.Text,
      content: { json: { text: "Original Draft content" } },
    });
    blockDraftOwnerId = b2.id;

    const c3 = await fixtures.createCourse({ title: "C3 Other Pub", ownerId: otherUser.id, isPublished: true });
    const l3 = await fixtures.createLesson({ title: "L3 Other", courseId: c3.id });
    const b3: Block = await fixtures.createBlock({
      lessonId: l3.id,
      type: BlockType.Text,
      content: { json: { text: "Original Other User's content" } },
    });
    blockPubOtherId = b3.id;
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should allow OWNER to update block in their DRAFT course", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .patch(`/blocks/${blockDraftOwnerId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(blockDraftOwnerId);
    expect(res.body.content.json.text).toBe(updatePayload.content.json.text);
  });

  it("should allow OWNER to update block in their PUBLISHED course", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .patch(`/blocks/${blockPubOwnerId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(blockPubOwnerId);
    expect(res.body.content.json.text).toBe(updatePayload.content.json.text);
  });

  it("should allow ADMIN to update block in another user's course", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .patch(`/blocks/${blockPubOtherId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(blockPubOtherId);
    expect(res.body.content.json.text).toBe(updatePayload.content.json.text);
  });

  it("should DENY RESTRICTED user (OWN_ONLY) update access to block in ANOTHER user's Published course", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .patch(`/blocks/${blockPubOtherId}`)
      .set("Authorization", `Bearer ${restrictedUpdateToken}`)
      .send(updatePayload);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("You are not allowed to update this block");
  });

  it("should DENY OWNER (without OWN_ONLY policy) access to block in ANOTHER user's Published course (Service Check)", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .patch(`/blocks/${blockPubOtherId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(updatePayload);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("You are not allowed to update this block");
  });

  it("should DENY PUBLIC user update access to any block (Missing Permission Check)", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .patch(`/blocks/${blockPubOwnerId}`)
      .set("Authorization", `Bearer ${publicOnlyToken}`)
      .send(updatePayload);

    expect(res.status).toBe(403);
  });

  it("should return 404 if block does not exist", async () => {
    const http = request(app.getHttpServer());
    const res = await http.patch(`/blocks/${uuid()}`).set("Authorization", `Bearer ${ownerToken}`).send(updatePayload);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.patch(`/blocks/${blockPubOwnerId}`).send(updatePayload);

    expect(res.status).toBe(401);
  });
});
