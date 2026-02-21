import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("DELETE /blocks/library/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let ownerToken: string;
  let hackerToken: string;
  let templateId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const role = await fixtures.createRole({
      name: "lib_deleter",
      permissions: [Permission.LESSONS_UPDATE, Permission.LESSONS_READ],
      policies: {
        [Permission.LESSONS_UPDATE]: [Policy.OWN_ONLY],
      },
    });

    const owner = await fixtures.createUser({ login: "owner_del", password: "Password123!", roleId: role.id });
    ownerToken = await fixtures.login(owner.login, "Password123!");

    const hacker = await fixtures.createUser({ login: "hacker_del", password: "Password123!", roleId: role.id });
    hackerToken = await fixtures.login(hacker.login, "Password123!");

    const t = await fixtures.createLibraryBlock({ ownerId: owner.id });
    templateId = t.id;
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should successfully delete own template and return 204", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/blocks/library/${templateId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(204);
  });

  it("should return 403 when trying to delete someone else's template", async () => {
    const t2 = await fixtures.createLibraryBlock({ ownerId: uuid() });

    await request(app.getHttpServer()).delete(`/blocks/library/${t2.id}`).set("Authorization", `Bearer hackerToken`);

    const res2 = await request(app.getHttpServer())
      .delete(`/blocks/library/${t2.id}`)
      .set("Authorization", `Bearer ${hackerToken}`);

    expect(res2.status).toBe(403);
  });

  it("should return 400 for invalid UUID format", async () => {
    const res = await request(app.getHttpServer())
      .delete("/blocks/library/invalid-uuid")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(400);
  });
});
