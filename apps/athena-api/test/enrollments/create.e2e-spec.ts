import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { CreateEnrollmentDto } from "../../src/learning/enrollment/dto/create.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

const mockCreateDto: CreateEnrollmentDto = {
  cohortId: "",
  ownerId: "",
};

describe("POST /enrollments (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let managerToken: string;
  let studentId: string;
  let cohortId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const { admin } = await fixtures.seedAdmin();
    const adminId = admin.id;

    const instructor = await fixtures.createInstructor({ ownerId: adminId, title: "Dr. House" });
    const course = await fixtures.createCourse({ title: "test" });
    const cohort = await fixtures.createCohort({
      name: "Medical 101",
      courseId: course.id,
      instructorId: instructor.id,
    });
    cohortId = cohort.id;

    const studentRole = await fixtures.createRole({ name: "student", permissions: [] });
    const student = await fixtures.createUser({
      login: "student_one",
      password: "Password123!",
      roleId: studentRole.id,
    });
    studentId = student.id;

    const managerRole = await fixtures.createRole({
      name: "enrollment_manager",
      permissions: [Permission.ENROLLMENTS_CREATE],
    });
    await fixtures.createUser({
      login: "manager",
      password: "Password123!",
      roleId: managerRole.id,
    });
    managerToken = await fixtures.login("manager", "Password123!");

    mockCreateDto.cohortId = cohortId;
    mockCreateDto.ownerId = studentId;
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should successfully enroll a student (Manager Access)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/enrollments").set("Authorization", `Bearer ${managerToken}`).send(mockCreateDto);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.cohortId).toBe(cohortId);
    expect(res.body.ownerId).toBe(studentId);
    expect(res.body).toHaveProperty("status");
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.post("/enrollments").send(mockCreateDto);

    expect(res.status).toBe(401);
  });

  it("should return 403 without ENROLLMENTS_CREATE permission", async () => {
    const noPermRole = await fixtures.createRole({ name: "viewer", permissions: [] });
    await fixtures.createUser({
      login: "no_enroll_perm",
      password: "Password123!",
      roleId: noPermRole.id,
    });
    const token = await fixtures.login("no_enroll_perm", "Password123!");

    const http = request(app.getHttpServer());
    const res = await http.post("/enrollments").set("Authorization", `Bearer ${token}`).send(mockCreateDto);

    expect(res.status).toBe(403);
  });

  it("should return 400 when validation fails (missing cohortId)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/enrollments").set("Authorization", `Bearer ${managerToken}`).send({
      ownerId: studentId,
    });

    expect(res.status).toBe(400);
  });

  it("should fail (500 or 400) if cohort does not exist", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http
      .post("/enrollments")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        ...mockCreateDto,
        cohortId: fakeId,
      });

    expect(res.status).not.toBe(201);
  });
});
