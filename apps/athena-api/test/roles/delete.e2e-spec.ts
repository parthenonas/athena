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

  describe("DELETE /roles/:id", () => {
    it("should delete empty role", async () => {
      const role = await fixtures.createRole({ name: "delete_me", permissions: [] });

      const res = await request(app.getHttpServer())
        .delete(`/roles/${role.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
    });

    it("should return 404 for missing role", async () => {
      const res = await request(app.getHttpServer())
        .delete("/roles/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it("should return 409 when role has accounts (FK violation)", async () => {
      const role = await fixtures.createRole({ name: "fk_role", permissions: [] });

      await fixtures.createUser({
        login: "attached_user",
        password: "Password123!",
        roleId: role.id,
      });

      const res = await request(app.getHttpServer())
        .delete(`/roles/${role.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });

    it("should return 403 without ADMIN permission", async () => {
      const role1 = await fixtures.createRole({ name: "role_to_delete", permissions: [] });
      const noPermRole = await fixtures.createRole({
        name: "user_without_permissions",
        permissions: [],
      });

      const login = "user_without_permissions";
      const password = "Password123!";

      await fixtures.createUser({
        login,
        password,
        roleId: noPermRole.id,
      });

      const token = await fixtures.login(login, password);

      const res = await request(app.getHttpServer())
        .delete(`/roles/${role1.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send();

      expect(res.status).toBe(403);
    });
  });
});
