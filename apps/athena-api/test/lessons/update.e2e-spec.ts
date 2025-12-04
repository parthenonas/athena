import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { UpdateLessonDto } from "../../src/content/lesson/dto/update.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /lessons/:id (e2e)", () => {
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
      name: "l_updater",
      permissions: [Permission.LESSONS_UPDATE],
      policies: { [Permission.LESSONS_UPDATE]: [Policy.OWN_ONLY] },
    });
    const owner = await fixtures.createUser({ login: "l_updater", password: "12345678", roleId: ownerRole.id });
    ownerId = owner.id;
    ownerToken = await fixtures.login(owner.login, "12345678");

    const attacker = await fixtures.createUser({ login: "l_att_upd", password: "12345678", roleId: ownerRole.id });
    attackerToken = await fixtures.login(attacker.login, "12345678");

    const c1 = await fixtures.createCourse({ title: "My Course", ownerId: ownerId });
    const l1 = await fixtures.createLesson({ title: "Old Title", courseId: c1.id });
    lessonId = l1.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should update OWN lesson", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateLessonDto = { title: "New Title" };

    const res = await http.patch(`/lessons/${lessonId}`).set("Authorization", `Bearer ${ownerToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("New Title");
  });

  it("should allow Admin to update ANY lesson", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateLessonDto = { title: "Admin Edit" };

    const res = await http.patch(`/lessons/${lessonId}`).set("Authorization", `Bearer ${adminToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Admin Edit");
  });

  it("should DENY updating someone else's lesson (Policy Check)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateLessonDto = { title: "Hacked" };

    const res = await http.patch(`/lessons/${lessonId}`).set("Authorization", `Bearer ${attackerToken}`).send(dto);

    expect(res.status).toBe(403);
  });
});
