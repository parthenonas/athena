import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { UpdateInstructorDto } from "../../src/learning/instructor/dto/update.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /instructors/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let ownerToken: string;
  let attackerToken: string;

  let instructorId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const instructorRole = await fixtures.createRole({
      name: "instructor_editor",
      permissions: [Permission.INSTRUCTORS_UPDATE, Permission.INSTRUCTORS_READ],
      policies: { [Permission.INSTRUCTORS_UPDATE]: [Policy.OWN_ONLY] },
    });

    const ownerUser = await fixtures.createUser({
      login: "inst_owner",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    ownerToken = await fixtures.login("inst_owner", "Password123!");

    const profile = await fixtures.createInstructor({
      ownerId: ownerUser.id,
      title: "Original Title",
      bio: "Original Bio",
    });
    instructorId = profile.id;

    const attackerUser = await fixtures.createUser({
      login: "inst_attacker",
      password: "Password123!",
      roleId: instructorRole.id,
    });
    attackerToken = await fixtures.login("inst_attacker", "Password123!");

    await fixtures.createInstructor({
      ownerId: attackerUser.id,
      title: "Attacker",
    });
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should update OWN profile (Owner Success)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateInstructorDto = { title: "Updated Title" };

    const res = await http.patch(`/instructors/${instructorId}`).set("Authorization", `Bearer ${ownerToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(instructorId);
    expect(res.body.title).toBe("Updated Title");
  });

  it("should update ANY profile as Admin (Bypass Policy)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateInstructorDto = { title: "Admin Was Here" };

    const res = await http.patch(`/instructors/${instructorId}`).set("Authorization", `Bearer ${adminToken}`).send(dto);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Admin Was Here");
  });

  it("should DENY updating someone else's profile (Security Check)", async () => {
    const http = request(app.getHttpServer());
    const dto: UpdateInstructorDto = { title: "Hacked" };

    const res = await http
      .patch(`/instructors/${instructorId}`)
      .set("Authorization", `Bearer ${attackerToken}`)
      .send(dto);

    expect(res.status).toBe(403);
  });

  it("should return 400 for invalid data", async () => {
    const http = request(app.getHttpServer());

    const fakeId = uuid();
    const res = await http
      .patch(`/instructors/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Ghost" });

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.patch(`/instructors/${instructorId}`).send({ title: "New" });

    expect(res.status).toBe(401);
  });
});
