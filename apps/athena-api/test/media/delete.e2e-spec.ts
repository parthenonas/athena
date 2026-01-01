import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /media/:id (e2e)", () => {
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
      name: "deleter",
      permissions: [Permission.FILES_DELETE, Permission.FILES_CREATE],
      policies: { [Permission.FILES_DELETE]: [Policy.OWN_ONLY] },
    });

    await fixtures.createUser({ login: "owner", password: "Qwerty123!", roleId: role.id });
    ownerToken = await fixtures.login("owner", "Qwerty123!");

    await fixtures.createUser({ login: "stranger", password: "Qwerty123!", roleId: role.id });
    strangerToken = await fixtures.login("stranger", "Qwerty123!");

    const uploadRes = await request(app.getHttpServer())
      .post("/media")
      .set("Authorization", `Bearer ${ownerToken}`)
      .attach("file", Buffer.from("trash"), "trash.txt");

    fileId = uploadRes.body.id;
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should forbid deletion by stranger", async () => {
    await request(app.getHttpServer())
      .delete(`/media/${fileId}`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .expect(403);
  });

  it("should delete file by owner", async () => {
    await request(app.getHttpServer())
      .delete(`/media/${fileId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/media/${fileId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(404);
  });
});
