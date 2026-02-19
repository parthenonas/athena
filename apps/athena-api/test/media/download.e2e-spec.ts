import { FileAccess, Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /media/:id/download (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let ownerToken: string;
  let strangerToken: string;
  let fileId: string;
  const content = "Super secret content from MinIO";

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const role = await fixtures.createRole({
      name: "downloader",
      permissions: [Permission.FILES_READ, Permission.FILES_CREATE],
      policies: { [Permission.FILES_READ]: [Policy.OWN_ONLY] },
    });

    await fixtures.createUser({ login: "owner", password: "Qwerty123!", roleId: role.id });
    ownerToken = await fixtures.login("owner", "Qwerty123!");

    await fixtures.createUser({ login: "stranger", password: "Qwerty123!", roleId: role.id });
    strangerToken = await fixtures.login("stranger", "Qwerty123!");

    const uploadRes = await request(app.getHttpServer())
      .post("/media")
      .set("Authorization", `Bearer ${ownerToken}`)
      .attach("file", Buffer.from(content), "stream.txt")
      .field("access", FileAccess.Private);

    fileId = uploadRes.body.id;
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should download file content (Owner)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/media/${fileId}/download`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.headers["content-disposition"]).toContain("attachment");

    expect(res.text).toBe(content);
  });

  it("should return 403 for stranger", async () => {
    await request(app.getHttpServer())
      .get(`/media/${fileId}/download`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .expect(403);
  });

  it("should return 404 for missing file", async () => {
    await request(app.getHttpServer())
      .get("/media/00000000-0000-0000-0000-000000000000/download")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(404);
  });
});
