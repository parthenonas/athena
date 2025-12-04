import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { ReadLessonDto } from "../../src/content/lesson/dto/read.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /lessons (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerOnlyToken: string;
  let publicOnlyToken: string;

  let creatorId: string;
  let otherUserId: string;

  let courseCreatorPublished: string;
  let courseCreatorDraft: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const creatorRole = await fixtures.createRole({
      name: "creator_role",
      permissions: [Permission.LESSONS_READ, Permission.COURSES_READ],
    });
    const creator = await fixtures.createUser({ login: "creator_l_all", password: "12345678", roleId: creatorRole.id });
    creatorId = creator.id;

    const ownerRole = await fixtures.createRole({
      name: "owner_reader",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.OWN_ONLY] },
    });
    const ownerUser = await fixtures.createUser({ login: "owner_l_all", password: "12345678", roleId: ownerRole.id });
    ownerOnlyToken = await fixtures.login(ownerUser.login, "12345678");

    const publicRole = await fixtures.createRole({
      name: "public_reader",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.ONLY_PUBLISHED] },
    });
    const publicUser = await fixtures.createUser({
      login: "public_l_all",
      password: "12345678",
      roleId: publicRole.id,
    });
    publicOnlyToken = await fixtures.login(publicUser.login, "12345678");

    const otherRole = await fixtures.createRole({ name: "other_role", permissions: [] });
    const otherUser = await fixtures.createUser({ login: "other_l_all", password: "12345678", roleId: otherRole.id });
    otherUserId = otherUser.id;

    const c1 = await fixtures.createCourse({ title: "C1 Pub", ownerId: creatorId, isPublished: true });
    courseCreatorPublished = c1.id;
    await fixtures.createLesson({ title: "L1.1", courseId: c1.id, order: 1 });
    await fixtures.createLesson({ title: "L1.2", courseId: c1.id, order: 2 });

    const c2 = await fixtures.createCourse({ title: "C2 Draft", ownerId: creatorId, isPublished: false });
    courseCreatorDraft = c2.id;
    await fixtures.createLesson({ title: "L2.1", courseId: c2.id, order: 1 });

    const c3 = await fixtures.createCourse({ title: "C3 Other", ownerId: otherUserId, isPublished: true });
    await fixtures.createLesson({ title: "L3.1", courseId: c3.id, order: 1 });
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return lessons filtered by courseId", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .get(`/lessons?courseId=${courseCreatorPublished}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].title).toBe("L1.1");
  });

  it("should support pagination and sorting", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .get(`/lessons?courseId=${courseCreatorPublished}&page=1&limit=1&sortOrder=DESC`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data: ReadLessonDto[] = res.body.data;

    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("L1.2");
    expect(res.body.meta.total).toBe(2);
  });

  it("should see lessons ONLY from own courses", async () => {
    const http = request(app.getHttpServer());
    const res = await http
      .get(`/lessons?courseId=${courseCreatorPublished}`)
      .set("Authorization", `Bearer ${ownerOnlyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("should see lessons ONLY from PUBLISHED courses", async () => {
    const http = request(app.getHttpServer());

    const resPub = await http
      .get(`/lessons?courseId=${courseCreatorPublished}`)
      .set("Authorization", `Bearer ${publicOnlyToken}`);

    expect(resPub.status).toBe(200);
    expect(resPub.body.data.length).toBeGreaterThan(0);

    const resDraft = await http
      .get(`/lessons?courseId=${courseCreatorDraft}`)
      .set("Authorization", `Bearer ${publicOnlyToken}`);

    expect(resDraft.status).toBe(200);
    expect(resDraft.body.data).toHaveLength(0);
  });

  it("should allow Admin to see everything (no policies)", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/lessons?courseId=${courseCreatorDraft}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
