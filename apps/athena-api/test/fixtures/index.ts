import { Permission } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";

import { AccountService } from "../../src/account/account.service";
import { RoleService } from "../../src/acl/role.service";

export class TestFixtures {
  constructor(
    private readonly app: INestApplication,
    private readonly dataSource: DataSource,
    private readonly accountService: AccountService,
    private readonly roleService: RoleService,
  ) {}

  async resetDatabase() {
    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      await this.dataSource.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
  }

  async seedAdmin({ login = "admin", password = "admin" } = {}) {
    let adminRole = await this.roleService.findByName("admin").catch(() => null);
    if (!adminRole) {
      adminRole = await this.roleService.create({
        name: "admin",
        permissions: [Permission.ADMIN],
        policies: {},
      });
    }

    let admin = await this.accountService.findOneByLogin(login).catch(() => null);
    if (!admin) {
      admin = await this.accountService.create({
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
    const role = await this.roleService.create({ name, permissions, policies });
    return role;
  }

  async createUser({ login = "user1", password = "pass", roleId }) {
    const user = await this.accountService.create({
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
}
