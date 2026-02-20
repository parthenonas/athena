import { FileAccess, Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /media/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let ownerToken: string;
  let strangerToken: string;
  let fileId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const role = await fixtures.createRole({
      name: "viewer",
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
      .attach("file", Buffer.from("meta-test"), "meta.txt")
      .field("access", FileAccess.Private);

    fileId = uploadRes.body.id;
  }, 60000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should return metadata for owner", async () => {
    const res = await request(app.getHttpServer()).get(`/media/${fileId}`).set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(fileId);
    expect(res.body.originalName).toBe("meta.txt");
    expect(res.body).not.toHaveProperty("buffer");
  });

  it("should return 403 for stranger (Policy.OWN_ONLY)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/media/${fileId}`)
      .set("Authorization", `Bearer ${strangerToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent id", async () => {
    const res = await request(app.getHttpServer())
      .get("/media/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
  });
});
