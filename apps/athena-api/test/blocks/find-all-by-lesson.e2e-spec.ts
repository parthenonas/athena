import { Permission, Policy, BlockType } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /blocks/lesson/:lessonId (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let publicOnlyToken: string;
  let restrictedRoleId: string;

  let creatorId: string;
  let otherUserId: string;

  let lessonPubOwnerId: string;
  let lessonDraftOwnerId: string;
  let lessonPubOtherId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const ownerRole = await fixtures.createRole({
      name: "b_owner_reader",
      permissions: [Permission.LESSONS_READ, Permission.LESSONS_UPDATE],
    });
    const ownerUser = await fixtures.createUser({ login: "b_owner", password: "12345678", roleId: ownerRole.id });
    creatorId = ownerUser.id;
    ownerToken = await fixtures.login(ownerUser.login, "12345678");

    const publicRole = await fixtures.createRole({
      name: "b_public_reader",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.ONLY_PUBLISHED] },
    });
    const publicUser = await fixtures.createUser({ login: "b_public", password: "12345678", roleId: publicRole.id });
    publicOnlyToken = await fixtures.login(publicUser.login, "12345678");

    const restrictedRole = await fixtures.createRole({
      name: "b_restricted_read",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.OWN_ONLY] },
    });
    restrictedRoleId = restrictedRole.id;

    const otherUser = await fixtures.createUser({ login: "b_other", password: "12345678", roleId: ownerRole.id });
    otherUserId = otherUser.id;

    const c1 = await fixtures.createCourse({ title: "C1 Pub", ownerId: creatorId, isPublished: true });
    const l1 = await fixtures.createLesson({ title: "L1 Pub", courseId: c1.id });
    lessonPubOwnerId = l1.id;
    await fixtures.createBlock({
      lessonId: l1.id,
      type: BlockType.Text,
      orderIndex: 1024,
      content: { text: "Block A" },
    });
    await fixtures.createBlock({
      lessonId: l1.id,
      type: BlockType.Text,
      orderIndex: 2048,
      content: { text: "Block B" },
    });

    const c2 = await fixtures.createCourse({ title: "C2 Draft", ownerId: creatorId, isPublished: false });
    const l2 = await fixtures.createLesson({ title: "L2 Draft", courseId: c2.id });
    lessonDraftOwnerId = l2.id;
    await fixtures.createBlock({
      lessonId: l2.id,
      type: BlockType.Text,
      orderIndex: 500,
      content: { text: "Draft Block 1" },
    });

    const c3 = await fixtures.createCourse({ title: "C3 Other Pub", ownerId: otherUserId, isPublished: true });
    const l3 = await fixtures.createLesson({ title: "L3 Other", courseId: c3.id });
    lessonPubOtherId = l3.id;
    await fixtures.createBlock({
      lessonId: l3.id,
      type: BlockType.Text,
      orderIndex: 100,
      content: { text: "Other Block" },
    });
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return blocks for a Published lesson and correctly sort them (Admin)", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/blocks/lesson/${lessonPubOwnerId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].orderIndex).toBe(1024);
    expect(res.body[0].content.text).toBeDefined();
    expect(res.body[0].type).toBe(BlockType.Text);
  });

  it("should return blocks for a Draft lesson to the OWNER", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/blocks/lesson/${lessonDraftOwnerId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].content.text).toBeDefined();
  });

  it("should allow PUBLIC user to see blocks in a PUBLISHED lesson", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/blocks/lesson/${lessonPubOwnerId}`).set("Authorization", `Bearer ${publicOnlyToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("should DENY PUBLIC user access to blocks in a DRAFT lesson (Policy Check)", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .get(`/blocks/lesson/${lessonDraftOwnerId}`)
      .set("Authorization", `Bearer ${publicOnlyToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("You are not allowed to view blocks in this lesson");
  });

  it("should DENY OWNER access to blocks in ANOTHER user's lesson (Ownership Check)", async () => {
    const http = request(app.getHttpServer());

    const restrictedUser = await fixtures.createUser({
      login: "restricted_reader",
      password: "12345678",
      roleId: restrictedRoleId,
    });
    const restrictedToken = await fixtures.login(restrictedUser.login, "12345678");

    const res = await http.get(`/blocks/lesson/${lessonPubOtherId}`).set("Authorization", `Bearer ${restrictedToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 if lesson does not exist", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/blocks/lesson/${uuid()}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
