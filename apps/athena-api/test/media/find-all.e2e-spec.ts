import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /media (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let token: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const role = await fixtures.createRole({
      name: "lister",
      permissions: [Permission.FILES_READ, Permission.FILES_CREATE],
    });

    await fixtures.createUser({ login: "user", password: "Qwerty123!", roleId: role.id });
    token = await fixtures.login("user", "Qwerty123!");

    const http = request(app.getHttpServer());
    const auth = { Authorization: `Bearer ${token}` };

    await http.post("/media").set(auth).attach("file", Buffer.from("1"), "cat.jpg");
    await http.post("/media").set(auth).attach("file", Buffer.from("2"), "dog.png");
    await http.post("/media").set(auth).attach("file", Buffer.from("3"), "resume.pdf");
  }, 30000);

  afterAll(async () => {
    await shutdownE2E(app);
  });

  it("should return paginated list", async () => {
    const res = await request(app.getHttpServer())
      .get("/media")
      .query({ page: 1, limit: 10 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.total).toBe(3);
  });

  it("should filter by search", async () => {
    const res = await request(app.getHttpServer())
      .get("/media")
      .query({ search: "resume" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].originalName).toBe("resume.pdf");
  });

  it("should filter by mime type", async () => {
    const res = await request(app.getHttpServer())
      .get("/media")
      .query({ type: "image/" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.data).toHaveLength(2);
  });
});
