import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("Media Quotas & Usage (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let studentToken: string;
  let adminToken: string;
  let roleId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const studentRole = await fixtures.createRole({
      name: "quota_student",
      permissions: [Permission.FILES_CREATE, Permission.FILES_READ],
    });
    roleId = studentRole.id;

    await fixtures.createUser({ login: "student_q", password: "Password1!", roleId });
    studentToken = await fixtures.login("student_q", "Password1!");

    const adminRole = await fixtures.createRole({
      name: "super_admin_q",
      permissions: [Permission.ADMIN],
    });
    await fixtures.createUser({ login: "admin_q", password: "Password1!", roleId: adminRole.id });
    adminToken = await fixtures.login("admin_q", "Password1!");
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  describe("GET /media/usage", () => {
    it("should return empty usage initially", async () => {
      const res = await request(app.getHttpServer())
        .get("/media/usage")
        .set("Authorization", `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        usedBytes: 0,
        percentage: 0,
      });

      expect(res.body.limitBytes).toBeGreaterThan(0);
    });

    it("should increase usage after upload", async () => {
      const buffer = Buffer.alloc(1024, "a");

      await request(app.getHttpServer())
        .post("/media")
        .set("Authorization", `Bearer ${studentToken}`)
        .attach("file", buffer, "test_1kb.txt")
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/media/usage")
        .set("Authorization", `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.usedBytes).toBe(1024);
    });
  });

  describe("POST /media/quotas (Admin)", () => {
    it("should forbid student to change quotas", async () => {
      await request(app.getHttpServer())
        .post("/media/quotas")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ roleName: "quota_student", limitBytes: 5000 })
        .expect(403);
    });

    it("should allow admin to update quota", async () => {
      await request(app.getHttpServer())
        .post("/media/quotas")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ roleName: "quota_student", limitBytes: 2048 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/media/usage")
        .set("Authorization", `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.limitBytes).toBe(2048);
      expect(res.body.percentage).toBe(50);
    });
  });

  describe("Quota Enforcement", () => {
    it("should block upload if quota exceeded", async () => {
      const bigBuffer = Buffer.alloc(1025, "b");

      await request(app.getHttpServer())
        .post("/media")
        .set("Authorization", `Bearer ${studentToken}`)
        .attach("file", bigBuffer, "too_big.txt")
        .expect(413);
    });

    it("should allow upload if within quota", async () => {
      const exactBuffer = Buffer.alloc(1024, "c");

      await request(app.getHttpServer())
        .post("/media")
        .set("Authorization", `Bearer ${studentToken}`)
        .attach("file", exactBuffer, "limit_hit.txt")
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/media/usage")
        .set("Authorization", `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.percentage).toBe(100);
      expect(res.body.usedBytes).toBe(2048);
    });
  });
});
