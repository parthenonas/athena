import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("PATCH /roles/:id/policies (e2e)", () => {
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
    const res = await request(app.getHttpServer()).patch("/roles/some-id/policies").send({ policies: {} });

    expect(res.status).toBe(401);
  });

  it("should return 403 for non-admin user", async () => {
    const role = await fixtures.createRole({
      name: "noperms",
      permissions: [],
    });

    const login = "noperms_user";
    const password = "12345678";

    await fixtures.createUser({ login, password, roleId: role.id });
    const token = await fixtures.login(login, password);

    const res = await request(app.getHttpServer())
      .patch("/roles/some-id/policies")
      .set("Authorization", `Bearer ${token}`)
      .send({ policies: {} });

    expect(res.status).toBe(403);
  });

  it("should return 404 when role not found", async () => {
    const res = await request(app.getHttpServer())
      .patch("/roles/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/policies")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ policies: {} });

    expect(res.status).toBe(404);
  });

  it("should update policies (admin)", async () => {
    const role = await fixtures.createRole({
      name: "update_policies_role",
      permissions: [Permission.COURSES_UPDATE],
      policies: {},
    });

    const res = await request(app.getHttpServer())
      .patch(`/roles/${role.id}/policies`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        policies: {
          [Permission.COURSES_UPDATE]: [Policy.OWN_ONLY],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.policies).toEqual({
      [Permission.COURSES_UPDATE]: [Policy.OWN_ONLY],
    });
  });

  it("should return 400 on invalid policies format", async () => {
    const role = await fixtures.createRole({
      name: "invalid_policies_role",
      permissions: [],
      policies: {},
    });

    const res = await request(app.getHttpServer())
      .patch(`/roles/${role.id}/policies`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        policies: "not-object",
      });

    expect(res.status).toBe(400);
  });
});
