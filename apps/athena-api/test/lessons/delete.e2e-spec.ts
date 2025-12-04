import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /lessons/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let attackerToken: string;

  let ownerId: string;
  let lessonId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin({ password: "12345678" });
    adminToken = token;

    const ownerRole = await fixtures.createRole({
      name: "l_deleter",
      permissions: [Permission.LESSONS_DELETE],
      policies: { [Permission.LESSONS_DELETE]: [Policy.OWN_ONLY] },
    });
    const owner = await fixtures.createUser({ login: "l_deleter", password: "12345678", roleId: ownerRole.id });
    ownerId = owner.id;
    ownerToken = await fixtures.login(owner.login, "12345678");

    const attacker = await fixtures.createUser({ login: "l_att_del", password: "12345678", roleId: ownerRole.id });
    attackerToken = await fixtures.login(attacker.login, "12345678");

    const c1 = await fixtures.createCourse({ title: "Del Course", ownerId: ownerId });
    const l1 = await fixtures.createLesson({ title: "To Delete", courseId: c1.id });
    lessonId = l1.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should DENY deleting someone else's lesson", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/lessons/${lessonId}`).set("Authorization", `Bearer ${attackerToken}`);

    expect(res.status).toBe(403);
  });

  it("should delete OWN lesson", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/lessons/${lessonId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(204);

    const check = await http.get(`/lessons/${lessonId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(check.status).toBe(404);
  });

  it("should return 404 for non-existent lesson", async () => {
    const http = request(app.getHttpServer());
    const res = await http.delete(`/lessons/${uuid()}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
