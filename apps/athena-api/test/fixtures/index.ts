import { Permission, BlockType, EnrollmentStatus } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { DataSource, Repository } from "typeorm";

import { Block } from "../../src/content/block/entities/block.entity";
import { Course } from "../../src/content/course/entities/course.entity";
import { Lesson } from "../../src/content/lesson/entities/lesson.entity";
import { IdentityService } from "../../src/identity";
import { Cohort } from "../../src/learning/cohort/entities/cohort.entity";
import { Enrollment } from "../../src/learning/enrollment/entities/enrollment.entity";
import { Instructor } from "../../src/learning/instructor/entities/instructor.entity";
import { Schedule } from "../../src/learning/schedule/entities/schedule.entity";

export class TestFixtures {
  private readonly lessonRepo: Repository<Lesson>;
  private readonly courseRepo: Repository<Course>;
  private readonly blockRepo: Repository<Block>;
  private readonly instructorRepo: Repository<Instructor>;
  private readonly cohortRepo: Repository<Cohort>;
  private readonly enrollmentRepo: Repository<Enrollment>;
  private readonly scheduleRepo: Repository<Schedule>;

  constructor(
    private readonly app: INestApplication,
    private readonly dataSource: DataSource,
    private readonly identityService: IdentityService,
  ) {
    this.lessonRepo = this.app.get(getRepositoryToken(Lesson));
    this.courseRepo = this.app.get(getRepositoryToken(Course));
    this.blockRepo = this.app.get(getRepositoryToken(Block));
    this.instructorRepo = this.app.get(getRepositoryToken(Instructor));
    this.cohortRepo = this.app.get(getRepositoryToken(Cohort));
    this.enrollmentRepo = this.app.get(getRepositoryToken(Enrollment));
    this.scheduleRepo = this.app.get(getRepositoryToken(Schedule));
  }

  async resetDatabase() {
    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      await this.dataSource.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
  }

  async seedAdmin({ login = "admin", password = "Password123!" } = {}) {
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

  async createBlock(args: Partial<Block> = {}): Promise<Block> {
    const defaultData = {
      lessonId: args.lessonId || "temp-lesson-id-for-block",
      orderIndex: 1024,
      type: BlockType.Text,
      content: { json: { default: true } },
    };

    const entity = this.blockRepo.create({ ...defaultData, ...args });
    return this.blockRepo.save(entity);
  }

  async createInstructor(args: Partial<Instructor> = {}): Promise<Instructor> {
    const defaultData = {
      ownerId: "user-1",
      bio: "Default Bio",
      title: "Default Title",
    };

    const entity = this.instructorRepo.create({ ...defaultData, ...args });
    return this.instructorRepo.save(entity);
  }

  async createCohort(args: Partial<Cohort> = {}): Promise<Cohort> {
    const defaultData = {
      name: "Default Cohort",
      startDate: new Date(),
    };

    const entity = this.cohortRepo.create({ ...defaultData, ...args });
    return this.cohortRepo.save(entity);
  }

  async createEnrollment(args: Partial<Enrollment> = {}): Promise<Enrollment> {
    const defaultData = {
      status: EnrollmentStatus.Active,
    };

    const entity = this.enrollmentRepo.create({ ...defaultData, ...args });
    return this.enrollmentRepo.save(entity);
  }

  async createSchedule(args: Partial<Schedule> = {}): Promise<Schedule> {
    const defaultData = {
      startAt: new Date(),
      isOpenManually: false,
    };

    const entity = this.scheduleRepo.create({ ...defaultData, ...args });
    return this.scheduleRepo.save(entity);
  }
}
