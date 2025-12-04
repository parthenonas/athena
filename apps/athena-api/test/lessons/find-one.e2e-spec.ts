import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /lessons/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let restrictedToken: string;
  let publicToken: string;

  let ownerId: string;

  let lessonInPubCourse: string;
  let lessonInDraftCourse: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin({ password: "12345678" });
    adminToken = token;

    const ownerRole = await fixtures.createRole({
      name: "l_one_owner",
      permissions: [Permission.LESSONS_READ],
    });
    const owner = await fixtures.createUser({
      login: "l_one_owner",
      password: "12345678",
      roleId: ownerRole.id,
    });
    ownerId = owner.id;
    ownerToken = await fixtures.login(owner.login, "12345678");

    const restrictedRole = await fixtures.createRole({
      name: "l_one_restr",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.OWN_ONLY] },
    });
    const restrUser = await fixtures.createUser({
      login: "l_one_restr",
      password: "12345678",
      roleId: restrictedRole.id,
    });
    restrictedToken = await fixtures.login(restrUser.login, "12345678");

    const publicRole = await fixtures.createRole({
      name: "l_one_public",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.ONLY_PUBLISHED] },
    });
    const publicUser = await fixtures.createUser({
      login: "l_one_public",
      password: "12345678",
      roleId: publicRole.id,
    });
    publicToken = await fixtures.login(publicUser.login, "12345678");

    const c1 = await fixtures.createCourse({ title: "Pub C", ownerId, isPublished: true });
    const l1 = await fixtures.createLesson({ title: "L_Pub", courseId: c1.id });
    lessonInPubCourse = l1.id;

    const c2 = await fixtures.createCourse({ title: "Draft C", ownerId, isPublished: false });
    const l2 = await fixtures.createLesson({ title: "L_Draft", courseId: c2.id });
    lessonInDraftCourse = l2.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should allow Owner to view lesson in DRAFT course", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/lessons/${lessonInDraftCourse}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(lessonInDraftCourse);
  });

  it("should allow viewing lesson in PUBLISHED course", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/lessons/${lessonInPubCourse}`).set("Authorization", `Bearer ${publicToken}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("L_Pub");
  });

  it("should DENY viewing lesson in DRAFT course", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/lessons/${lessonInDraftCourse}`).set("Authorization", `Bearer ${publicToken}`);

    expect(res.status).toBe(403);
  });

  it("should DENY viewing lesson in SOMEONE ELSE'S course", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/lessons/${lessonInPubCourse}`).set("Authorization", `Bearer ${restrictedToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent lesson", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/lessons/${uuid()}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/lessons/${lessonInPubCourse}`);

    expect(res.status).toBe(401);
  });
});
