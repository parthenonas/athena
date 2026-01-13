import { Permission, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { ReadInstructorDto } from "../../src/learning/instructor/dto/read.dto";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("GET /instructors (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;

  let adminToken: string;
  let limitedInstructorToken: string;
  let publicViewerToken: string;

  let instructorA_Id: string;
  let instructorB_Id: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    await fixtures.resetDatabase();

    const { admin, adminToken: token } = await fixtures.seedAdmin();
    adminToken = token;

    const limitedRole = await fixtures.createRole({
      name: "limited_instructor",
      permissions: [Permission.INSTRUCTORS_READ],
      policies: { [Permission.INSTRUCTORS_READ]: [Policy.OWN_ONLY] },
    });

    const userA = await fixtures.createUser({
      login: "inst_limited",
      password: "Password123!",
      roleId: limitedRole.id,
    });
    limitedInstructorToken = await fixtures.login("inst_limited", "Password123!");

    const profileA = await fixtures.createInstructor({
      ownerId: userA.id,
      title: "Limited Guy",
    });
    instructorA_Id = profileA.id;

    const publicRole = await fixtures.createRole({
      name: "public_viewer",
      permissions: [Permission.INSTRUCTORS_READ],
    });

    const userB = await fixtures.createUser({
      login: "viewer_all",
      password: "Password123!",
      roleId: publicRole.id,
    });
    publicViewerToken = await fixtures.login("viewer_all", "Password123!");

    const profileB = await fixtures.createInstructor({
      ownerId: userB.id,
      title: "Public Guy",
    });
    instructorB_Id = profileB.id;

    await fixtures.createInstructor({
      ownerId: admin.id,
      title: "Admin Profile",
    });
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  it("should return ALL instructors for Admin (No Policies applied)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/instructors").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data: ReadInstructorDto[] = res.body.data;

    expect(data.length).toBeGreaterThanOrEqual(3);
  });

  it("should return ALL instructors for Viewer without policies", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/instructors").set("Authorization", `Bearer ${publicViewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it("should return ONLY OWN profile for Limited Instructor (OWN_ONLY policy)", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/instructors").set("Authorization", `Bearer ${limitedInstructorToken}`);

    expect(res.status).toBe(200);
    const data: ReadInstructorDto[] = res.body.data;

    expect(data.length).toBe(1);
    expect(data[0].id).toBe(instructorA_Id);
    expect(data.find(i => i.id === instructorB_Id)).toBeUndefined();
  });

  it("should support search by title", async () => {
    const http = request(app.getHttpServer());

    const res = await http.get("/instructors?search=Limited").set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe("Limited Guy");
  });

  it("should return 401 without token", async () => {
    const http = request(app.getHttpServer());
    const res = await http.get("/instructors");

    expect(res.status).toBe(401);
  });
});
