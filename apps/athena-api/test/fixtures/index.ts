import { Permission, BlockType, EnrollmentStatus } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { getModelToken } from "@nestjs/mongoose";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Model } from "mongoose";
import request from "supertest";
import { DataSource, Repository } from "typeorm";
import { v4 as uuid } from "uuid";

import { Block } from "../../src/content/block/entities/block.entity";
import { Course } from "../../src/content/course/entities/course.entity";
import { Lesson } from "../../src/content/lesson/entities/lesson.entity";
import { LessonView } from "../../src/content/lesson/schemas/lesson-view.schema";
import { IdentityService } from "../../src/identity";
import { Profile } from "../../src/identity/profile/entities/profile.entity";
import { Cohort } from "../../src/learning/cohort/entities/cohort.entity";
import { Enrollment } from "../../src/learning/enrollment/entities/enrollment.entity";
import { Instructor } from "../../src/learning/instructor/entities/instructor.entity";
import { InstructorView } from "../../src/learning/instructor/schemas/instructor-view.schema";
import { InitializeProgressCommand } from "../../src/learning/progress/application/commands/initialize-progress.command";
import { Schedule } from "../../src/learning/schedule/entities/schedule.entity";

export class TestFixtures {
  private readonly lessonRepo: Repository<Lesson>;
  private readonly courseRepo: Repository<Course>;
  private readonly blockRepo: Repository<Block>;
  private readonly instructorRepo: Repository<Instructor>;
  private readonly cohortRepo: Repository<Cohort>;
  private readonly enrollmentRepo: Repository<Enrollment>;
  private readonly scheduleRepo: Repository<Schedule>;
  private readonly profileRepo: Repository<Profile>;
  private readonly instructorViewModel: Model<InstructorView>;
  private readonly lessonViewModel: Model<LessonView>;
  private readonly commandBus: CommandBus;

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
    this.profileRepo = this.app.get(getRepositoryToken(Profile));
    this.instructorViewModel = this.app.get(getModelToken(InstructorView.name));
    this.lessonViewModel = this.app.get(getModelToken(LessonView.name));
    this.commandBus = this.app.get(CommandBus);
  }

  async resetDatabase() {
    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      await this.dataSource.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

    if (this.instructorViewModel) {
      await this.instructorViewModel.deleteMany({});
    }

    if (this.lessonViewModel) {
      await this.lessonViewModel.deleteMany({});
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

  async createProfile(args: Partial<Profile> = {}): Promise<Profile> {
    const defaultData = {
      firstName: "Test",
      lastName: "User",
      ownerId: args.ownerId || uuid(),
      metadata: {},
    };

    const entity = this.profileRepo.create({ ...defaultData, ...args });
    return this.profileRepo.save(entity);
  }

  async createCourse(args: Partial<Course> = {}): Promise<Course> {
    const defaultData = {
      title: "Test Course",
      description: "Default Desc",
      isPublished: false,
      ownerId: uuid(),
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
      lessonId: args.lessonId || uuid(),
      orderIndex: 1024,
      type: BlockType.Text,
      content: { json: { default: true } },
    };

    const entity = this.blockRepo.create({ ...defaultData, ...args });
    return this.blockRepo.save(entity);
  }

  async createInstructor(args: Partial<Instructor> = {}): Promise<Instructor> {
    const defaultData = {
      ownerId: uuid(),
      bio: "Default Bio",
      title: "Default Title",
    };

    const entity = this.instructorRepo.create({ ...defaultData, ...args });
    const saved = await this.instructorRepo.save(entity);

    const profile = await this.profileRepo.findOne({ where: { ownerId: saved.ownerId } });

    if (this.instructorViewModel) {
      await this.instructorViewModel.create({
        instructorId: saved.id,
        ownerId: saved.ownerId,
        title: saved.title!,
        bio: saved.bio!,
        firstName: profile?.firstName || "Unknown",
        lastName: profile?.lastName || "Unknown",
        avatarUrl: profile?.avatarUrl || "",
      });
    }

    return saved;
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

  async enrollStudentWithProgress(args: {
    userId: string;
    cohortId: string;
    courseId: string;
    status?: EnrollmentStatus;
  }): Promise<Enrollment> {
    const enrollment = await this.createEnrollment({
      ownerId: args.userId,
      cohortId: args.cohortId,
      status: args.status || EnrollmentStatus.Active,
    });

    await this.commandBus.execute(new InitializeProgressCommand(enrollment.id, args.courseId, args.userId));

    return enrollment;
  }

  async createSchedule(args: Partial<Schedule> = {}): Promise<Schedule> {
    const defaultData = {
      startAt: new Date(),
      isOpenManually: false,
    };

    const entity = this.scheduleRepo.create({ ...defaultData, ...args });
    return this.scheduleRepo.save(entity);
  }

  async createLessonView(args: Partial<LessonView> = {}): Promise<LessonView | null> {
    if (!this.lessonViewModel) return null;

    const defaultData = {
      lessonId: args.lessonId || uuid(),
      courseId: args.courseId || uuid(),
      title: "Test Lesson View",
      order: 1,
      isDraft: true,
      blocks: [],
    };

    return this.lessonViewModel.create({ ...defaultData, ...args });
  }
}
