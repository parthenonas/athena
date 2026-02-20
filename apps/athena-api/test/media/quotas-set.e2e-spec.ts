import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /media/quotas (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let adminToken: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should set quota for a role", async () => {
    const res = await request(app.getHttpServer())
      .post("/media/quotas")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        roleName: "vip_student",
        limitBytes: 104857600,
      })
      .expect(201);

    expect(res.body.roleName).toBe("vip_student");
    expect(res.body.limitBytes).toBe("104857600");
  });

  it("should return 400 for invalid data", async () => {
    await request(app.getHttpServer())
      .post("/media/quotas")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        roleName: "",
        limitBytes: -5,
      })
      .expect(400);
  });
});
