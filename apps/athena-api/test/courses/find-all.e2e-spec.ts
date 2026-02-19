import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { ReadCourseDto } from "../../src/content/course/dto/read.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /courses (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let adminToken: string;
  let creatorToken: string;
  let creatorId: string;
  let ownerReaderToken: string;
  let publishedReaderToken: string;
  let publishedOwnerReaderToken: string;
  let coursePublishedId: string;
  let courseUnpublishedId: string;
  let courseOtherUserId: string;
  let coursePublishedOwnerId: string;

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

    const creator = await fixtures.createUser({
      login: "creator_user",
      password: "Password123!",
      roleId: creatorRole.id,
    });
    creatorId = creator.id;
    creatorToken = await fixtures.login(creator.login, "Password123!");

    const ownerReaderRole = await fixtures.createRole({
      name: "owner_reader",
      permissions: [Permission.COURSES_READ],
      policies: { [Permission.COURSES_READ]: [Policy.OWN_ONLY] },
    });
    const ownerReader = await fixtures.createUser({
      login: "owner_reader",
      password: "Password123!",
      roleId: ownerReaderRole.id,
    });
    ownerReaderToken = await fixtures.login(ownerReader.login, "Password123!");

    const publishedReaderRole = await fixtures.createRole({
      name: "published_reader",
      permissions: [Permission.COURSES_READ],
      policies: { [Permission.COURSES_READ]: [Policy.ONLY_PUBLISHED] },
    });
    const publishedReader = await fixtures.createUser({
      login: "published_reader",
      password: "Password123!",
      roleId: publishedReaderRole.id,
    });
    publishedReaderToken = await fixtures.login(publishedReader.login, "Password123!");

    const publishedOwnerReaderRole = await fixtures.createRole({
      name: "published_owner_reader",
      permissions: [Permission.COURSES_READ],
      policies: { [Permission.COURSES_READ]: [Policy.PUBLISHED_OR_OWNER] },
    });
    const publishedOwnerReader = await fixtures.createUser({
      login: "published_owner_reader",
      password: "Password123!",
      roleId: publishedOwnerReaderRole.id,
    });
    publishedOwnerReaderToken = await fixtures.login(publishedOwnerReader.login, "Password123!");

    const otherRole = await fixtures.createRole({ name: "other_guy", permissions: [] });
    const otherUser = await fixtures.createUser({
      login: "other_user",
      password: "Password123!",
      roleId: otherRole.id,
    });
    courseOtherUserId = otherUser.id;

    const course1 = await fixtures.createCourse({
      title: "A - Published By Creator",
      ownerId: creatorId,
      isPublished: true,
    });
    const course2 = await fixtures.createCourse({
      title: "B - Unpublished By Creator",
      ownerId: creatorId,
      isPublished: false,
    });

    const course3 = await fixtures.createCourse({
      title: "C - Published By Other",
      ownerId: courseOtherUserId,
      isPublished: true,
    });

    const course4 = await fixtures.createCourse({
      title: "D - Published By Published Owner",
      ownerId: publishedOwnerReader.id,
      isPublished: false,
    });

    coursePublishedId = course1.id;
    courseUnpublishedId = course2.id;
    courseOtherUserId = course3.id;
    coursePublishedOwnerId = course4.id;
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return all courses for Admin (bypasses policies)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/courses").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(3);

    expect(res.body.data.some(c => c.id === courseUnpublishedId)).toBe(true);
  });

  it("should return all courses when no policies are applied", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/courses").set("Authorization", `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(3);

    expect(res.body.data.some(c => c.id === courseUnpublishedId)).toBe(true);
  });

  it("should reject without token (401)", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/courses");

    expect(res.status).toBe(401);
  });

  it("should only return courses owned by the user (OWN_ONLY applied)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/courses").set("Authorization", `Bearer ${ownerReaderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
    expect(res.body.meta.total).toBe(0);
  });

  it("should return only published courses when ONLY_PUBLISHED applied", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/courses").set("Authorization", `Bearer ${publishedReaderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(c => c.id === coursePublishedId)).toBe(true);
    expect(res.body.data.some(c => c.id === courseOtherUserId)).toBe(true);
    expect(res.body.data.some(c => c.id === courseUnpublishedId)).toBe(false);
  });

  it("should return only published and all own courses when PUBLISHED_AND_OWNER applied", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/courses").set("Authorization", `Bearer ${publishedOwnerReaderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some(c => c.id === coursePublishedId)).toBe(true);
    expect(res.body.data.some(c => c.id === courseOtherUserId)).toBe(true);
    expect(res.body.data.some(c => c.id === courseUnpublishedId)).toBe(false);
    expect(res.body.data.some(c => c.id === coursePublishedOwnerId)).toBe(true);
  });

  it("should support search by title and pagination", async () => {
    const http = request(app.getHttpServer());

    const page = 1;
    const limit = 1;

    const res = await http
      .get(`/courses?page=${page}&limit=${limit}&search=Creator`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data: ReadCourseDto[] = res.body.data;

    expect(data.length).toBe(limit);
    expect(res.body.meta.total).toBeGreaterThan(0);
    expect(res.body.meta.limit).toBe(limit);
    expect(res.body.meta.page).toBe(page);

    expect(data[0].title).toContain("Creator");
  });
});
