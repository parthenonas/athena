import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /courses/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let attackerToken: string;

  let ownerId: string;
  let courseId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin({ password: "Password123!" });
    adminToken = token;

    const deleterRole = await fixtures.createRole({
      name: "deleter_role",
      permissions: [Permission.COURSES_DELETE],
      policies: { [Permission.COURSES_DELETE]: [Policy.OWN_ONLY] },
    });

    const owner = await fixtures.createUser({
      login: "course_owner_del",
      password: "Password123!",
      roleId: deleterRole.id,
    });
    ownerId = owner.id;
    ownerToken = await fixtures.login(owner.login, "Password123!");

    const attacker = await fixtures.createUser({
      login: "course_attacker_del",
      password: "Password123!",
      roleId: deleterRole.id,
    });
    attackerToken = await fixtures.login(attacker.login, "Password123!");

    const course = await fixtures.createCourse({
      title: "To Be Deleted",
      ownerId: ownerId,
    });
    courseId = course.id;
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should DENY deleting someone else's course (Service Check)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/courses/${courseId}`).set("Authorization", `Bearer ${attackerToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.delete(`/courses/${courseId}`);
    expect(res.status).toBe(401);
  });

  it("should delete own course (Owner Success)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.delete(`/courses/${courseId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(204);

    const checkRes = await http.get(`/courses/${courseId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(checkRes.status).toBe(404);
  });

  it("should allow Admin to delete ANY course (including recreating one)", async () => {
    const http = request(app.getHttpServer());

    const newCourse = await fixtures.createCourse({ title: "Admin Target", ownerId: ownerId });

    const res = await http.delete(`/courses/${newCourse.id}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("should return 404 if course does not exist (Idempotency check)", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http.delete(`/courses/${fakeId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
