import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /media/quotas/:roleName (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let adminToken: string;
  let studentToken: string;

  const targetRoleName = "quota_victim_role";

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const adminRole = await fixtures.createRole({
      name: "quota_admin_role",
      permissions: [Permission.ADMIN],
    });
    await fixtures.createUser({ login: "admin", password: "Password1!", roleId: adminRole.id });
    adminToken = await fixtures.login("admin", "Password1!");

    const studentRole = await fixtures.createRole({
      name: "quota_student_role",
      permissions: [Permission.FILES_READ],
    });
    await fixtures.createUser({ login: "student", password: "Password1!", roleId: studentRole.id });
    studentToken = await fixtures.login("student", "Password1!");

    await request(app.getHttpServer())
      .post("/media/quotas")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roleName: targetRoleName, limitBytes: 104857600 })
      .expect(201);
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should forbid deletion by non-admin (student)", async () => {
    await request(app.getHttpServer())
      .delete(`/media/quotas/${targetRoleName}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(403);
  });

  it("should delete quota by admin", async () => {
    await request(app.getHttpServer())
      .delete(`/media/quotas/${targetRoleName}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get("/media/quotas")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const deletedQuota = res.body.find((q: any) => q.roleName === targetRoleName);
    expect(deletedQuota).toBeUndefined();
  });

  it("should return 200 even if quota does not exist (idempotency)", async () => {
    await request(app.getHttpServer())
      .delete(`/media/quotas/${targetRoleName}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
  });
});
