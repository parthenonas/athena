import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("RoleController (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  describe("PATCH /roles/:id", () => {
    it("should update role (admin)", async () => {
      const role = await fixtures.createRole({
        name: "role_to_update",
        permissions: [],
      });

      const res = await request(app.getHttpServer())
        .patch(`/roles/${role.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "updated_name" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("updated_name");
    });

    it("should return 404 when updating nonexistent role", async () => {
      const res = await request(app.getHttpServer())
        .patch("/roles/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "x" });

      expect(res.status).toBe(404);
    });

    it("should return 409 on name conflict", async () => {
      await fixtures.createRole({ name: "r1", permissions: [] });
      const role2 = await fixtures.createRole({ name: "r2", permissions: [] });

      const res = await request(app.getHttpServer())
        .patch(`/roles/${role2.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "r1" });

      expect(res.status).toBe(409);
    });

    it("should return 403 without ADMIN permission", async () => {
      const role1 = await fixtures.createRole({ name: "role_to_update", permissions: [] });
      const noPermRole = await fixtures.createRole({
        name: "user_without_permissions",
        permissions: [],
      });

      const login = "user_without_permissions";
      const password = "12345678";

      await fixtures.createUser({
        login,
        password,
        roleId: noPermRole.id,
      });

      const token = await fixtures.login(login, password);

      const res = await request(app.getHttpServer())
        .patch(`/roles/${role1.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "r1" });

      expect(res.status).toBe(403);
    });
  });
});
