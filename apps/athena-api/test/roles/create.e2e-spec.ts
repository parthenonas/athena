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

  describe("POST /roles", () => {
    it("should return 401 without auth", async () => {
      const res = await request(app.getHttpServer()).post("/roles").send({
        name: "guest",
      });
      expect(res.status).toBe(401);
    });

    it("should return 403 for user without ADMIN permission", async () => {
      const role = await fixtures.createRole({
        name: "noperms_role",
        permissions: [],
      });

      const login = "noperms";
      const password = "12345678";

      await fixtures.createUser({ login, password, roleId: role.id });
      const token = await fixtures.login(login, password);

      const res = await request(app.getHttpServer())
        .post("/roles")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "new_role" });

      expect(res.status).toBe(403);
    });

    it("should create role (admin)", async () => {
      const res = await request(app.getHttpServer()).post("/roles").set("Authorization", `Bearer ${adminToken}`).send({
        name: "fresh_role",
        permissions: [],
        policies: {},
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("fresh_role");
    });

    it("should return 400 if name missing", async () => {
      const res = await request(app.getHttpServer())
        .post("/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ permissions: [] });

      expect(res.status).toBe(400);
    });

    it("should return 409 when role name already exists", async () => {
      await fixtures.createRole({
        name: "dupe_role",
        permissions: [],
      });

      const res = await request(app.getHttpServer()).post("/roles").set("Authorization", `Bearer ${adminToken}`).send({
        name: "dupe_role",
        permissions: [],
      });

      expect(res.status).toBe(409);
    });
  });
});
