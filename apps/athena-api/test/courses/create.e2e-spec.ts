import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { CreateCourseDto } from "../../src/content/course/dto/create.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

const mockCreateDto: CreateCourseDto = {
  title: "New Course via E2E",
  description: "Test description",
  tags: ["e2e"],
  isPublished: false,
};

describe("POST /courses (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let adminToken: string;
  let teacherToken: string;
  let teacherId: string;
  let userRoleId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const { adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const teacherRole = await fixtures.createRole({
      name: "teacher",
      permissions: [Permission.COURSES_CREATE, Permission.COURSES_UPDATE, Permission.COURSES_DELETE],
    });
    userRoleId = teacherRole.id;

    const teacher = await fixtures.createUser({
      login: "teacher_user",
      password: "password123",
      roleId: userRoleId,
    });
    teacherId = teacher.id;
    teacherToken = await fixtures.login("teacher_user", "password123");
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should successfully create course and assign ownerId from token (positive test)", async () => {
    const http = request(app.getHttpServer());
    const ghostOwnerId = uuid();

    const res = await http
      .post("/courses")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        ...mockCreateDto,
        title: "Security Test Course",
        ownerId: ghostOwnerId,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("title", "Security Test Course");

    expect(res.body).toHaveProperty("ownerId", teacherId);
    expect(res.body.ownerId).not.toBe(ghostOwnerId);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.post("/courses").send(mockCreateDto);

    expect(res.status).toBe(401);
  });

  it("should return 403 without COURSES_CREATE permission", async () => {
    const noPermRole = await fixtures.createRole({
      name: "viewer",
      permissions: [Permission.COURSES_READ],
    });

    await fixtures.createUser({
      login: "no_create_user",
      password: "12345678",
      roleId: noPermRole.id,
    });
    const token = await fixtures.login("no_create_user", "12345678");

    const http = request(app.getHttpServer());
    const res = await http.post("/courses").set("Authorization", `Bearer ${token}`).send(mockCreateDto);

    expect(res.status).toBe(403);
  });

  it("should return 400 when validation fails (short title)", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .post("/courses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        ...mockCreateDto,
        title: "T",
      });

    expect(res.status).toBe(400);
  });

  it("should return 409 when title already exists", async () => {
    await fixtures.createCourse({ title: "Dupe Title", ownerId: teacherId });
    const http = request(app.getHttpServer());

    const res = await http
      .post("/courses")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        ...mockCreateDto,
        title: "Dupe Title",
      });

    expect(res.status).toBe(409);
  });
});
