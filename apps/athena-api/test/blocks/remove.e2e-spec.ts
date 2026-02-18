import { Permission, Policy, BlockType } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { Block } from "../../src/content/block/entities/block.entity";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /blocks/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let restrictedDeleteToken: string;

  let blockToDeleteId: string;
  let blockForbiddenId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin({ password: "Password123!" });
    adminToken = token;

    const ownerRole = await fixtures.createRole({
      name: "b_remove_owner",
      permissions: [Permission.LESSONS_READ, Permission.LESSONS_UPDATE],
      policies: { [Permission.LESSONS_UPDATE]: [Policy.OWN_ONLY] },
    });
    const ownerUser = await fixtures.createUser({
      login: "b_remove_owner",
      password: "Password123!",
      roleId: ownerRole.id,
    });
    ownerToken = await fixtures.login(ownerUser.login, "Password123!");

    const restrictedRole = await fixtures.createRole({
      name: "b_remove_restricted",
      permissions: [Permission.LESSONS_UPDATE],
      policies: { [Permission.LESSONS_UPDATE]: [Policy.OWN_ONLY] },
    });
    const restrictedUser = await fixtures.createUser({
      login: "b_remove_restricted_guy",
      password: "Password123!",
      roleId: restrictedRole.id,
    });
    restrictedDeleteToken = await fixtures.login(restrictedUser.login, "Password123!");

    const attacker = await fixtures.createUser({
      login: "b_remove_attacker",
      password: "Password123!",
      roleId: restrictedRole.id,
    });

    const c1 = await fixtures.createCourse({ title: "C1 Delete", ownerId: ownerUser.id, isPublished: true });
    const l1 = await fixtures.createLesson({ title: "L1 Delete", courseId: c1.id });
    const b1: Block = await fixtures.createBlock({ lessonId: l1.id, type: BlockType.Text });
    blockToDeleteId = b1.id;

    const c2 = await fixtures.createCourse({ title: "C2 Forbidden", ownerId: attacker.id, isPublished: true });
    const l2 = await fixtures.createLesson({ title: "L2 Forbidden", courseId: c2.id });
    const b2: Block = await fixtures.createBlock({ lessonId: l2.id, type: BlockType.Text });
    blockForbiddenId = b2.id;
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should allow OWNER to remove their own block", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/blocks/${blockToDeleteId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(204);

    const checkRes = await http.get(`/blocks/${blockToDeleteId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(checkRes.status).toBe(404);
  });

  it("should DENY restricted user (OWN_ONLY) remove access to block they don't own", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .delete(`/blocks/${blockForbiddenId}`)
      .set("Authorization", `Bearer ${restrictedDeleteToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("You are not allowed to delete this block");
  });

  it("should return 404 for non-existent block", async () => {
    const http = request(app.getHttpServer());
    const res = await http.delete(`/blocks/${uuid()}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.delete(`/blocks/${blockForbiddenId}`);

    expect(res.status).toBe(401);
  });
});
