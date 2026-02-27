import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /blocks/library/:id (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let ownerToken: string;

  let myTemplateId: string;
  let otherTemplateId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;
    await fixtures.resetDatabase();

    const role = await fixtures.createRole({
      name: "lib_reader_strict",
      permissions: [Permission.LESSONS_READ],
      policies: { [Permission.LESSONS_READ]: [Policy.OWN_ONLY] },
    });

    const userA = await fixtures.createUser({ login: "owner", password: "Password123!", roleId: role.id });
    ownerToken = await fixtures.login(userA.login, "Password123!");

    const userB = await fixtures.createUser({ login: "other", password: "Password123!", roleId: role.id });
    await fixtures.login(userB.login, "Password123!");

    const t1 = await fixtures.createLibraryBlock({
      ownerId: userA.id,
      content: { json: { text: "Private Gold" } },
    });
    myTemplateId = t1.id;

    const t2 = await fixtures.createLibraryBlock({
      ownerId: userB.id,
      content: { json: { text: "Secret Data" } },
    });
    otherTemplateId = t2.id;
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return template details if user is the owner", async () => {
    const res = await request(app.getHttpServer())
      .get(`/blocks/library/${myTemplateId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(myTemplateId);
    expect(res.body.content.json.text).toBe("Private Gold");
  });

  it("should return 403 (Forbidden) if user tries to access someone else's template", async () => {
    const res = await request(app.getHttpServer())
      .get(`/blocks/library/${otherTemplateId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("You are not allowed");
  });

  it("should return 404 (Not Found) if template does not exist", async () => {
    const res = await request(app.getHttpServer())
      .get(`/blocks/library/${uuid()}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
  });

  it("should return 400 (Bad Request) if ID is not a valid UUID", async () => {
    const res = await request(app.getHttpServer())
      .get("/blocks/library/not-a-uuid")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(400);
  });

  it("should return 401 (Unauthorized) if no token provided", async () => {
    const res = await request(app.getHttpServer()).get(`/blocks/library/${myTemplateId}`);
    expect(res.status).toBe(401);
  });
});
