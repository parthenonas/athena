import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";

import { ContentService } from "../../src/content";
import { IdentityService } from "../../src/identity";

export class TestFixtures {
  constructor(
    private readonly app: INestApplication,
    private readonly dataSource: DataSource,
    private readonly identityService: IdentityService,
    private readonly contentService: ContentService,
  ) {}

  async resetDatabase() {
    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      await this.dataSource.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
  }

  async seedAdmin({ login = "admin", password = "admin" } = {}) {
    let adminRole = await this.identityService.findRoleByName("admin").catch(() => null);
    if (!adminRole) {
      adminRole = await this.identityService.createRole({
        name: "admin",
        permissions: [Permission.ADMIN],
        policies: {},
      });
    }

    let admin = await this.identityService.findAccountByLogin(login).catch(() => null);
    if (!admin) {
      admin = await this.identityService.createAccount({
        login: login,
        password: password,
        roleId: adminRole.id,
      });
    }

    const http = request(this.app.getHttpServer());
    const res = await http.post("/accounts/login").send({
      login: login,
      password: password,
    });

    return {
      admin,
      adminRole,
      adminToken: res.body.accessToken,
    };
  }

  async createRole({ name = "user", permissions = [], policies = {} } = {}) {
    const role = await this.identityService.createRole({ name, permissions, policies });
    return role;
  }

  async createUser({ login = "user1", password = "pass", roleId }) {
    const user = await this.identityService.createAccount({
      login,
      password,
      roleId,
    });
    return user;
  }

  async login(login: string, password: string) {
    const http = request(this.app.getHttpServer());
    const res = await http.post("/accounts/login").send({ login, password });
    return res.body.accessToken;
  }

  async createCourse({ title = "Test Course", ownerId = "user-1", isPublished = false, description = "desc" } = {}) {
    const course = await this.contentService.createCourse({ title, description, isPublished }, ownerId);
    return course;
  }
}
