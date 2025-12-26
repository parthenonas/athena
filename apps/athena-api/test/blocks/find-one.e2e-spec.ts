import { Permission, Policy, BlockType } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { Block } from "../../src/content/block/entities/block.entity";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /blocks/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let publicOnlyToken: string;
  let restrictedToken: string;

  let creatorId: string;
  let restrictedRoleId: string;

  let blockPubOwnerId: string;
  let blockDraftOwnerId: string;
  let blockPubOtherId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin({ password: "Password123!" });
    adminToken = token;

    const ownerRole = await fixtures.createRole({
      name: "b_owner_reader",
      permissions: [Permission.LESSONS_READ, Permission.LESSONS_UPDATE],
    });
    const ownerUser = await fixtures.createUser({
      login: "b_one_owner",
      password: "Password123!",
      roleId: ownerRole.id,
    });
    creatorId = ownerUser.id;
    ownerToken = await fixtures.login(ownerUser.login, "Password123!");

    const publicRole = await fixtures.createRole({
      name: "b_one_public_reader",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.ONLY_PUBLISHED] },
    });
    const publicUser = await fixtures.createUser({
      login: "b_one_public",
      password: "Password123!",
      roleId: publicRole.id,
    });
    publicOnlyToken = await fixtures.login(publicUser.login, "Password123!");

    const restrictedRole = await fixtures.createRole({
      name: "b_one_restricted",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.OWN_ONLY] },
    });
    restrictedRoleId = restrictedRole.id;
    const restrictedUser = await fixtures.createUser({
      login: "b_one_restricted",
      password: "Password123!",
      roleId: restrictedRoleId,
    });
    restrictedToken = await fixtures.login(restrictedUser.login, "Password123!");

    const otherUser = await fixtures.createUser({
      login: "b_one_other",
      password: "Password123!",
      roleId: ownerRole.id,
    });

    const c1 = await fixtures.createCourse({ title: "C1 Pub", ownerId: creatorId, isPublished: true });
    const l1 = await fixtures.createLesson({ title: "L1 Pub", courseId: c1.id });
    const b1: Block = await fixtures.createBlock({
      lessonId: l1.id,
      type: BlockType.Text,
      content: { json: { data: "Public content" } },
    });
    blockPubOwnerId = b1.id;

    const c2 = await fixtures.createCourse({ title: "C2 Draft", ownerId: creatorId, isPublished: false });
    const l2 = await fixtures.createLesson({ title: "L2 Draft", courseId: c2.id });
    const b2: Block = await fixtures.createBlock({
      lessonId: l2.id,
      type: BlockType.Text,
      content: { json: { data: "Draft content" } },
    });
    blockDraftOwnerId = b2.id;

    const c3 = await fixtures.createCourse({ title: "C3 Other Pub", ownerId: otherUser.id, isPublished: true });
    const l3 = await fixtures.createLesson({ title: "L3 Other", courseId: c3.id });
    const b3: Block = await fixtures.createBlock({
      lessonId: l3.id,
      type: BlockType.Text,
      content: { json: { data: "Other User's content" } },
    });
    blockPubOtherId = b3.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should allow OWNER to view block in DRAFT course", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/blocks/${blockDraftOwnerId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(blockDraftOwnerId);
    expect(res.body.content.json.data).toBe("Draft content");
  });

  it("should allow PUBLIC user (ONLY_PUBLISHED) to view block in PUBLISHED course", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/blocks/${blockPubOwnerId}`).set("Authorization", `Bearer ${publicOnlyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(blockPubOwnerId);
  });

  it("should DENY PUBLIC user access to block in DRAFT course (Policy Check)", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/blocks/${blockDraftOwnerId}`).set("Authorization", `Bearer ${publicOnlyToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("You are not allowed to view this block");
  });

  it("should DENY RESTRICTED user (OWN_ONLY) access to block in ANOTHER user's Published course", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/blocks/${blockPubOtherId}`).set("Authorization", `Bearer ${restrictedToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("You are not allowed to view this block");
  });

  it("should return 404 if block does not exist", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/blocks/${uuid()}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/blocks/${blockPubOwnerId}`);

    expect(res.status).toBe(401);
  });
});
