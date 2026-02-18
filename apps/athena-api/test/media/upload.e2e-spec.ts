import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { Repository } from "typeorm";

import { MediaQuota } from "../../src/media/entities/media-quota.entity";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /media (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let adminToken: string;
  let studentToken: string;
  let studentRoleId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const role = await fixtures.createRole({
      name: "student_uploader",
      permissions: [Permission.FILES_CREATE],
    });
    studentRoleId = role.id;

    await fixtures.createUser({
      login: "uploader",
      password: "Password123!",
      roleId: studentRoleId,
    });
    studentToken = await fixtures.login("uploader", "Password123!");
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should upload file successfully (Admin)", async () => {
    const http = request(app.getHttpServer());
    const buffer = Buffer.from("test content");

    const res = await http
      .post("/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", buffer, "test.txt")
      .field("access", "public");

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("url");
    expect(res.body.url).toContain("http");
    expect(res.body.originalName).toBe("test.txt");
  });

  it("should upload file successfully (Student with permission)", async () => {
    const http = request(app.getHttpServer());
    const buffer = Buffer.from("homework");

    const res = await http
      .post("/media")
      .set("Authorization", `Bearer ${studentToken}`)
      .attach("file", buffer, "hw.doc");

    expect(res.status).toBe(201);
    expect(res.body.access).toBe("private");
    expect(res.body.url).toMatch(/\/api\/media\/.*\/download/);
  });

  it("should return 400 if no file attached", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/media").set("Authorization", `Bearer ${adminToken}`).send({ access: "private" });

    expect(res.status).toBe(400);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.post("/media").attach("file", Buffer.from("abc"), "test.txt");

    expect(res.status).toBe(401);
  });

  it("should return 403 without FILES_CREATE permission", async () => {
    const role = await fixtures.createRole({
      name: "viewer_only",
      permissions: [Permission.FILES_READ],
    });

    await fixtures.createUser({
      login: "viewer",
      password: "Password123!",
      roleId: role.id,
    });
    const token = await fixtures.login("viewer", "Password123!");

    const http = request(app.getHttpServer());
    const res = await http
      .post("/media")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("hack"), "virus.exe");

    expect(res.status).toBe(403);
  });

  it("should return 413 (Payload Too Large) if quota exceeded", async () => {
    const quotaRepo = app.get<Repository<MediaQuota>>(getRepositoryToken(MediaQuota));

    await quotaRepo.save({
      roleName: "student_uploader",
      limitBytes: "5",
    });

    const http = request(app.getHttpServer());
    const buffer = Buffer.from("1234567890");

    const res = await http
      .post("/media")
      .set("Authorization", `Bearer ${studentToken}`)
      .attach("file", buffer, "big_file.txt");

    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/Quota exceeded/i);
  });
});
