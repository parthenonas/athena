import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { CreateInstructorDto } from "../../src/learning/instructor/dto/create.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

const mockCreateDto: CreateInstructorDto = {
  ownerId: "",
  title: "Senior Lecturer",
  bio: "Expert in E2E testing",
};

describe("POST /instructors (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let managerToken: string;
  let targetUserId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const managerRole = await fixtures.createRole({
      name: "hr_manager",
      permissions: [Permission.INSTRUCTORS_CREATE],
    });

    await fixtures.createUser({
      login: "hr_user",
      password: "Password123!",
      roleId: managerRole.id,
    });
    managerToken = await fixtures.login("hr_user", "Password123!");

    const candidateRole = await fixtures.createRole({ name: "candidate", permissions: [] });
    const candidate = await fixtures.createUser({
      login: "candidate_user",
      password: "Password123!",
      roleId: candidateRole.id,
    });
    targetUserId = candidate.id;

    mockCreateDto.ownerId = targetUserId;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should successfully create instructor profile (Manager Access)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/instructors").set("Authorization", `Bearer ${managerToken}`).send(mockCreateDto);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ownerId).toBe(targetUserId);
    expect(res.body.title).toBe("Senior Lecturer");
  });

  it("should fail to create DUPLICATE profile for same user (Unique Constraint)", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .post("/instructors")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        ...mockCreateDto,
        title: "Duplicate Attempt",
      });

    expect(res.status).not.toBe(201);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.post("/instructors").send(mockCreateDto);

    expect(res.status).toBe(401);
  });

  it("should return 403 without INSTRUCTORS_CREATE permission", async () => {
    const noPermRole = await fixtures.createRole({ name: "viewer", permissions: [] });
    await fixtures.createUser({
      login: "viewer",
      password: "Password123!",
      roleId: noPermRole.id,
    });
    const token = await fixtures.login("viewer", "Password123!");

    const http = request(app.getHttpServer());
    const res = await http
      .post("/instructors")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...mockCreateDto, ownerId: uuid() });

    expect(res.status).toBe(403);
  });

  it("should return 400 when ownerId is missing", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/instructors").set("Authorization", `Bearer ${managerToken}`).send({
      title: "Ghost",
      bio: "No body",
    });

    expect(res.status).toBe(400);
  });
});
