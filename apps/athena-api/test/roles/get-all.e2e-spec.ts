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

  describe("GET /roles", () => {
    it("should return 401 when no token provided", async () => {
      const res = await request(app.getHttpServer()).get("/roles");
      expect(res.status).toBe(401);
    });

    it("should return 403 when user has no Permission.ADMIN", async () => {
      const role = await fixtures.createRole({
        name: "normal_user",
        permissions: [],
      });

      const login = "u1";
      const password = "12345678";

      await fixtures.createUser({ login, password, roleId: role.id });
      const token = await fixtures.login(login, password);

      const res = await request(app.getHttpServer()).get("/roles").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it("should return list of roles (admin)", async () => {
      const res = await request(app.getHttpServer()).get("/roles").set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
