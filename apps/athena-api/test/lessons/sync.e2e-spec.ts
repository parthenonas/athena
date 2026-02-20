import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /lessons/sync (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let regularUserToken: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin({ password: "Password123!" });
    adminToken = token;

    const userRole = await fixtures.createRole({
      name: "l_sync_attacker",
      permissions: [Permission.LESSONS_READ, Permission.LESSONS_CREATE],
    });
    const user = await fixtures.createUser({ login: "l_regular", password: "Password123!", roleId: userRole.id });
    regularUserToken = await fixtures.login(user.login, "Password123!");

    const course = await fixtures.createCourse({ title: "Sync Target Course", ownerId: user.id });

    const lesson1 = await fixtures.createLesson({ title: "Lesson 1", courseId: course.id });
    const lesson2 = await fixtures.createLesson({ title: "Lesson 2", courseId: course.id });

    await fixtures.createBlock({ lessonId: lesson1.id, orderIndex: 10 });
    await fixtures.createBlock({ lessonId: lesson1.id, orderIndex: 20 });
    await fixtures.createBlock({ lessonId: lesson2.id, orderIndex: 10 });
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should successfully rebuild Mongo projections (ADMIN ONLY)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/lessons/sync").set("Authorization", `Bearer ${adminToken}`).send();

    expect(res.status).toBe(200);

    expect(res.body.synced).toBe(2);
  });

  it("should DENY access to regular users without ADMIN permission", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/lessons/sync").set("Authorization", `Bearer ${regularUserToken}`).send();

    expect(res.status).toBe(403);
  });

  it("should DENY access if no token is provided", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/lessons/sync").send();

    expect(res.status).toBe(401);
  });
});
