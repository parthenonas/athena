import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /instructors/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let limitedUserToken: string;

  let limitedProfileId: string;
  let otherProfileId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const limitedRole = await fixtures.createRole({
      name: "limited_instructor_view",
      permissions: [Permission.INSTRUCTORS_READ],
      policies: { [Permission.INSTRUCTORS_READ]: [Policy.OWN_ONLY] },
    });

    const limitedUser = await fixtures.createUser({
      login: "limited_view",
      password: "Password123!",
      roleId: limitedRole.id,
    });
    limitedUserToken = await fixtures.login("limited_view", "Password123!");

    const p1 = await fixtures.createInstructor({
      ownerId: limitedUser.id,
      title: "Limited Profile",
    });
    limitedProfileId = p1.id;

    const otherUser = await fixtures.createUser({
      login: "other_view",
      password: "Password123!",
      roleId: limitedRole.id,
    });

    const p2 = await fixtures.createInstructor({
      ownerId: otherUser.id,
      title: "Other Profile",
    });
    otherProfileId = p2.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should allow Admin to view ANY instructor profile", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/instructors/${limitedProfileId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(limitedProfileId);
  });

  it("should allow User to view THEIR OWN profile", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/instructors/${limitedProfileId}`).set("Authorization", `Bearer ${limitedUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(limitedProfileId);
  });

  it("should DENY User viewing someone else's profile (Security Check)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/instructors/${otherProfileId}`).set("Authorization", `Bearer ${limitedUserToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http.get(`/instructors/${fakeId}`).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/instructors/${limitedProfileId}`);

    expect(res.status).toBe(401);
  });
});
