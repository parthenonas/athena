import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /courses/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let creatorToken: string;
  let publicReaderToken: string;
  let hybridReaderToken: string;

  let creatorId: string;
  let hybridReaderId: string;

  let courseCreatorPublished: string;
  let courseCreatorDraft: string;
  let courseHybridDraft: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const creatorRole = await fixtures.createRole({
      name: "creator",
      permissions: [Permission.COURSES_READ, Permission.COURSES_CREATE],
    });
    const creator = await fixtures.createUser({ login: "creator", password: "Password123!", roleId: creatorRole.id });
    creatorId = creator.id;
    creatorToken = await fixtures.login(creator.login, "Password123!");

    const publicRole = await fixtures.createRole({
      name: "public",
      permissions: [Permission.COURSES_READ],
      policies: { [Permission.COURSES_READ]: [Policy.ONLY_PUBLISHED] },
    });
    const publicUser = await fixtures.createUser({ login: "public", password: "Password123!", roleId: publicRole.id });
    publicReaderToken = await fixtures.login(publicUser.login, "Password123!");

    const hybridRole = await fixtures.createRole({
      name: "hybrid",
      permissions: [Permission.COURSES_READ, Permission.COURSES_CREATE],
      policies: { [Permission.COURSES_READ]: [Policy.PUBLISHED_OR_OWNER] },
    });
    const hybridUser = await fixtures.createUser({ login: "hybrid", password: "Password123!", roleId: hybridRole.id });
    hybridReaderId = hybridUser.id;
    hybridReaderToken = await fixtures.login(hybridUser.login, "Password123!");

    const c1 = await fixtures.createCourse({
      title: "Public Course",
      ownerId: creatorId,
      isPublished: true,
    });
    courseCreatorPublished = c1.id;

    const c2 = await fixtures.createCourse({
      title: "Creator Draft",
      ownerId: creatorId,
      isPublished: false,
    });
    courseCreatorDraft = c2.id;

    const c3 = await fixtures.createCourse({
      title: "Hybrid Draft",
      ownerId: hybridReaderId,
      isPublished: false,
    });
    courseHybridDraft = c3.id;
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should allow Admin to view ANY draft", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/courses/${courseCreatorDraft}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(courseCreatorDraft);
  });

  it("should allow Owner to view their own draft (Implicit Owner Access)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/courses/${courseCreatorDraft}`).set("Authorization", `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
  });

  it("should allow viewing published course", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .get(`/courses/${courseCreatorPublished}`)
      .set("Authorization", `Bearer ${publicReaderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isPublished).toBe(true);
  });

  it("should deny viewing unpublished course (even if not owner)", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/courses/${courseCreatorDraft}`).set("Authorization", `Bearer ${publicReaderToken}`);

    expect(res.status).toBe(403);
  });

  it("should allow viewing other user's published course", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .get(`/courses/${courseCreatorPublished}`)
      .set("Authorization", `Bearer ${hybridReaderToken}`);

    expect(res.status).toBe(200);
  });

  it("should allow viewing own draft", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/courses/${courseHybridDraft}`).set("Authorization", `Bearer ${hybridReaderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ownerId).toBe(hybridReaderId);
    expect(res.body.isPublished).toBe(false);
  });

  it("should deny viewing other user's draft", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/courses/${courseCreatorDraft}`).set("Authorization", `Bearer ${hybridReaderToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/courses/${courseCreatorPublished}`);
    expect(res.status).toBe(401);
  });

  it("should return 403 without COURSES_READ permission", async () => {
    const noPermRole = await fixtures.createRole({ name: "no_perm", permissions: [] });
    const user = await fixtures.createUser({ login: "noperm", password: "Password123!", roleId: noPermRole.id });
    const token = await fixtures.login(user.login, "Password123!");

    const http = request(app.getHttpServer());
    const res = await http.get(`/courses/${courseCreatorPublished}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const http = request(app.getHttpServer());
    const badId = uuid();
    const res = await http.get(`/courses/${badId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
