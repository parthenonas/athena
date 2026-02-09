import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /instructors/public/:id (e2e) - Mongo View", () => {
  let app: INestApplication;
  let fixtures: any;
  let token: string;

  let instructorId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const role = await fixtures.createRole({
      name: "instructor_single_view",
      permissions: [],
    });

    const user = await fixtures.createUser({
      login: "view_one",
      password: "Password123!",
      roleId: role.id,
    });

    token = await fixtures.login("view_one", "Password123!");

    await fixtures.createProfile({
      ownerId: user.id,
      firstName: "Alex",
      lastName: "Murphy",
    });

    const instructor = await fixtures.createInstructor({
      ownerId: user.id,
      title: "Robocop",
      bio: "Serving the public trust",
    });
    instructorId = instructor.id;

    await new Promise(r => setTimeout(r, 2000));
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return single instructor view by ID", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get(`/instructors/public/${instructorId}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.instructorId).toBe(instructorId);
    expect(res.body.firstName).toBe("Alex");
    expect(res.body.lastName).toBe("Murphy");
    expect(res.body.title).toBe("Robocop");
  });

  it("should return 404 for non-existent ID", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http.get(`/instructors/public/${fakeId}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get(`/instructors/public/${instructorId}`);
    expect(res.status).toBe(401);
  });
});
