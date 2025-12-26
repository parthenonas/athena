import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /roles/:id/permissions (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let adminToken: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const admin = await fixtures.seedAdmin();
    adminToken = admin.adminToken;
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should return 401 without token", async () => {
    const res = await request(app.getHttpServer()).patch("/roles/some-id/permissions").send({ permissions: [] });

    expect(res.status).toBe(401);
  });

  it("should return 403 if user lacks ADMIN permission", async () => {
    const role = await fixtures.createRole({
      name: "perm_user",
      permissions: [],
    });

    const login = "noperms_user";
    const password = "Password123!";

    await fixtures.createUser({ login, password, roleId: role.id });
    const token = await fixtures.login(login, password);

    const res = await request(app.getHttpServer())
      .patch("/roles/some-id/permissions")
      .set("Authorization", `Bearer ${token}`)
      .send({ permissions: [] });

    expect(res.status).toBe(403);
  });

  it("should return 404 for unknown role", async () => {
    const res = await request(app.getHttpServer())
      .patch("/roles/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ permissions: [] });

    expect(res.status).toBe(404);
  });

  it("should update permissions (admin)", async () => {
    const role = await fixtures.createRole({
      name: "update_perm_role",
      permissions: [],
    });

    const res = await request(app.getHttpServer())
      .patch(`/roles/${role.id}/permissions`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        permissions: [Permission.COURSES_CREATE, Permission.COURSES_READ],
      });

    expect(res.status).toBe(200);
    expect(res.body.permissions).toEqual([Permission.COURSES_CREATE, Permission.COURSES_READ]);
  });

  it("should return 400 on invalid body", async () => {
    const role = await fixtures.createRole({
      name: "invalid_perm_role",
      permissions: [],
    });

    const res = await request(app.getHttpServer())
      .patch(`/roles/${role.id}/permissions`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ permissions: "not-an-array" });

    expect(res.status).toBe(400);
  });
});
