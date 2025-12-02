import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { UpdateCourseDto } from "../../src/content/course/dto/update.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /courses/:id (e2e)", () => {
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

    const { adminToken: token } = await fixtures.seedAdmin({ password: "12345678" });
    adminToken = token;

    const ownerRole = await fixtures.createRole({
      name: "updater_role",
      permissions: [Permission.COURSES_UPDATE, Permission.COURSES_READ],
      policies: { [Permission.COURSES_UPDATE]: [Policy.OWN_ONLY] },
    });
    const owner = await fixtures.createUser({
      login: "course_owner_upd",
      password: "12345678",
      roleId: ownerRole.id,
    });
    ownerId = owner.id;
    ownerToken = await fixtures.login(owner.login, "12345678");

    const attacker = await fixtures.createUser({
      login: "course_attacker_upd",
      password: "12345678",
      roleId: ownerRole.id,
    });
    attackerToken = await fixtures.login(attacker.login, "12345678");

    const course = await fixtures.createCourse({
      title: "Original Title",
      description: "Original Desc",
      ownerId: ownerId,
      isPublished: false,
    });
    courseId = course.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should update own course (Owner Success)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateCourseDto = { title: "Updated by Owner" };

    const res = await http.patch(`/courses/${courseId}`).set("Authorization", `Bearer ${ownerToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(courseId);
    expect(res.body.title).toBe("Updated by Owner");
  });

  it("should update ANY course as Admin (Bypass Policy)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateCourseDto = { title: "Updated by Admin" };

    const res = await http.patch(`/courses/${courseId}`).set("Authorization", `Bearer ${adminToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated by Admin");
  });

  it("should DENY updating someone else's course (Service Check)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateCourseDto = { title: "Hacked Title" };

    const res = await http.patch(`/courses/${courseId}`).set("Authorization", `Bearer ${attackerToken}`).send(dto);

    expect(res.status).toBe(403);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.patch(`/courses/${courseId}`).send({ title: "New" });

    expect(res.status).toBe(401);
  });

  it("should return 404 if course does not exist", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http
      .patch(`/courses/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Ghost" });

    expect(res.status).toBe(404);
  });

  it("should return 400 for invalid data (short title)", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .patch(`/courses/${courseId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "X" });

    expect(res.status).toBe(400);
  });
});
