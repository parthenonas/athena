import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { CreateCohortDto } from "../../src/learning/cohort/dto/create.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

const mockCreateDto: CreateCohortDto = {
  name: "E2E Test Cohort",
  instructorId: "",
  startDate: new Date(),
};

describe("POST /cohorts (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let managerToken: string;
  let instructorId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    const adminData = await fixtures.seedAdmin();
    const adminId = adminData.admin.id;

    const instructor = await fixtures.createInstructor({
      ownerId: adminId,
      bio: "E2E Instructor",
      title: "Master",
    });
    instructorId = instructor.id;
    mockCreateDto.instructorId = instructorId;

    const managerRole = await fixtures.createRole({
      name: "cohort_manager",
      permissions: [Permission.COHORTS_CREATE],
    });

    await fixtures.createUser({
      login: "manager_user",
      password: "Password123!",
      roleId: managerRole.id,
    });

    managerToken = await fixtures.login("manager_user", "Password123!");
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should successfully create cohort (Manager with Permission)", async () => {
    const http = request(app.getHttpServer());

    const res = await http
      .post("/cohorts")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        ...mockCreateDto,
        name: "Manager Created Cohort",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("name", "Manager Created Cohort");
    expect(res.body).toHaveProperty("instructorId", instructorId);
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.post("/cohorts").send(mockCreateDto);

    expect(res.status).toBe(401);
  });

  it("should return 403 without COHORTS_CREATE permission", async () => {
    const noPermRole = await fixtures.createRole({
      name: "viewer",
      permissions: [Permission.COHORTS_READ],
    });

    await fixtures.createUser({
      login: "no_create_cohort",
      password: "Password123!",
      roleId: noPermRole.id,
    });
    const token = await fixtures.login("no_create_cohort", "Password123!");

    const http = request(app.getHttpServer());
    const res = await http.post("/cohorts").set("Authorization", `Bearer ${token}`).send(mockCreateDto);

    expect(res.status).toBe(403);
  });

  it("should return 400 when validation fails (missing instructorId)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.post("/cohorts").set("Authorization", `Bearer ${managerToken}`).send({
      name: "Invalid Cohort",
      startDate: new Date().toISOString(),
    });

    expect(res.status).toBe(400);
  });

  it("should fail when instructor does not exist (FK violation)", async () => {
    const http = request(app.getHttpServer());
    const fakeId = uuid();

    const res = await http
      .post("/cohorts")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        ...mockCreateDto,
        instructorId: fakeId,
      });

    expect(res.status).not.toBe(201);
  });
});
