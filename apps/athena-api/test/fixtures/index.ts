import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { DataSource, Repository } from "typeorm";

import { Course } from "../../src/content/course/entities/course.entity";
import { Lesson } from "../../src/content/lesson/entities/lesson.entity";
import { IdentityService } from "../../src/identity";

export class TestFixtures {
  private readonly lessonRepo: Repository<Lesson>;
  private readonly courseRepo: Repository<Course>;

  constructor(
    private readonly app: INestApplication,
    private readonly dataSource: DataSource,
    private readonly identityService: IdentityService,
  ) {
    this.lessonRepo = this.app.get(getRepositoryToken(Lesson));
    this.courseRepo = this.app.get(getRepositoryToken(Course));
  }

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

  async createCourse(args: Partial<Course> = {}): Promise<Course> {
    const defaultData = {
      title: "Test Course",
      description: "Default Desc",
      isPublished: false,
      ownerId: "user-1",
    };

    const entity = this.courseRepo.create({ ...defaultData, ...args });
    return this.courseRepo.save(entity);
  }

  async createLesson(args: Partial<Lesson> = {}): Promise<Lesson> {
    const defaultData = {
      title: "Test Lesson",
      order: 1,
      isDraft: true,
    };

    const entity = this.lessonRepo.create({ ...defaultData, ...args });
    return this.lessonRepo.save(entity);
  }
}
