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

  describe("GET /roles/:id", () => {
    it("should return 404 for nonexistent role", async () => {
      const res = await request(app.getHttpServer())
        .get("/roles/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it("should get role by id", async () => {
      const role = await fixtures.createRole({
        name: "reader_role",
        permissions: [],
      });

      const res = await request(app.getHttpServer())
        .get(`/roles/${role.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(role.id);
    });

    it("should return 403 without ADMIN permission", async () => {
      const role1 = await fixtures.createRole({ name: "role_to_get", permissions: [] });
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
        .get(`/roles/${role1.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send();

      expect(res.status).toBe(403);
    });
  });
});
