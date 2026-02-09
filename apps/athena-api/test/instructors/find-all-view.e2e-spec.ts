import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /instructors/public (e2e) - Mongo View", () => {
  let app: INestApplication;
  let fixtures: any;
  let token: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const role = await fixtures.createRole({
      name: "instructor_public_view",
      permissions: [],
    });

    const user1 = await fixtures.createUser({
      login: "public_inst_1",
      password: "Password123!",
      roleId: role.id,
    });

    token = await fixtures.login("public_inst_1", "Password123!");

    await fixtures.createProfile({
      ownerId: user1.id,
      firstName: "John",
      lastName: "Doe",
      avatarUrl: "https://example.com/avatar.jpg",
    });

    await fixtures.createInstructor({
      ownerId: user1.id,
      title: "Senior Java Developer",
      bio: "Expert in Spring Boot",
    });

    const user2 = await fixtures.createUser({
      login: "public_inst_2",
      password: "Password123!",
      roleId: role.id,
    });

    await fixtures.createProfile({
      ownerId: user2.id,
      firstName: "Jane",
      lastName: "Smith",
    });
    await fixtures.createInstructor({
      ownerId: user2.id,
      title: "Python Guru",
      bio: "Data Science expert",
    });

    await new Promise(r => setTimeout(r, 2000));
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return public view with joined profile data", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/instructors/public").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data.length).toBeGreaterThanOrEqual(2);

    const john = data.find((i: any) => i.title === "Senior Java Developer");
    expect(john).toBeDefined();
    expect(john.firstName).toBe("John");
    expect(john.lastName).toBe("Doe");
    expect(john.avatarUrl).toBe("https://example.com/avatar.jpg");
    expect(john.bio).toBe("Expert in Spring Boot");
  });

  it("should support search by bio (Mongo Regex)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/instructors/public?search=Data").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data.length).toBe(1);
    expect(data[0].firstName).toBe("Jane");
    expect(data[0].title).toBe("Python Guru");
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/instructors/public");
    expect(res.status).toBe(401);
  });
});
