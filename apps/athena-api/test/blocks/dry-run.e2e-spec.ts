import { Permission, ProgrammingLanguage, CodeExecutionMode, Policy } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { BlockDryRunDto } from "../../src/content/block/dto/dry-run.dto";
import { SubmissionQueueService } from "../../src/submission-queue/submission-queue.service";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /blocks/dry-run (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let queueService: SubmissionQueueService;

  let ownerToken: string;
  let otherToken: string;
  let lessonId: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    queueService = app.get(SubmissionQueueService);

    await fixtures.resetDatabase();
    await fixtures.seedAdmin({ password: "Password123!" });

    const ownerRole = await fixtures.createRole({
      name: "dry_run_owner",
      permissions: [Permission.BLOCKS_EXECUTE],
      policies: { [Permission.BLOCKS_EXECUTE]: [Policy.OWN_ONLY] },
    });
    const owner = await fixtures.createUser({ login: "dry_owner", password: "Password123!", roleId: ownerRole.id });

    ownerToken = await fixtures.login(owner.login, "Password123!");
    if (!ownerToken) throw new Error("Failed to login owner!");

    const otherRole = await fixtures.createRole({
      name: "dry_run_other",
      permissions: [Permission.BLOCKS_EXECUTE],
      policies: { [Permission.BLOCKS_EXECUTE]: [Policy.OWN_ONLY] },
    });
    const other = await fixtures.createUser({ login: "dry_other", password: "Password123!", roleId: otherRole.id });
    otherToken = await fixtures.login(other.login, "Password123!");

    const course = await fixtures.createCourse({ title: "Dry Course", ownerId: owner.id });
    const lesson = await fixtures.createLesson({ title: "Dry Lesson", courseId: course.id });
    lessonId = lesson.id;
  }, 30000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow OWNER to initiate dry run", async () => {
    const http = request(app.getHttpServer());

    const sendSpy = jest
      .spyOn(queueService, "sendForExecution")
      .mockResolvedValue({ submissionId: "test-uuid", status: "queued" });

    const dto: BlockDryRunDto = {
      lessonId: lessonId,
      socketId: "socket-abc-123",
      blockId: "blockId",
      content: {
        taskText: { json: {} },
        language: ProgrammingLanguage.Python,
        initialCode: "print('Hello E2E')",
        executionMode: CodeExecutionMode.IoCheck,
      },
    };

    const res = await http.post("/blocks/dry-run").set("Authorization", `Bearer ${ownerToken}`).send(dto);
    expect(res.status).toBe(202);

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          socketId: "socket-abc-123",
        }),
      }),
    );
  });

  it("should DENY access to someone else's lesson", async () => {
    const http = request(app.getHttpServer());
    const sendSpy = jest.spyOn(queueService, "sendForExecution");

    const dto: BlockDryRunDto = {
      lessonId: lessonId,
      socketId: "socket-hacker",
      blockId: "block-id",
      content: {
        taskText: { json: {} },
        language: ProgrammingLanguage.Python,
        initialCode: "print('hack')",
        executionMode: CodeExecutionMode.IoCheck,
      },
    };

    const res = await http.post("/blocks/dry-run").set("Authorization", `Bearer ${otherToken}`).send(dto);

    expect(res.status).toBe(403);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("should validate DTO (require socketId)", async () => {
    const http = request(app.getHttpServer());

    const dto = {
      lessonId: lessonId,
      content: { language: ProgrammingLanguage.Python, initialCode: "x=1", executionMode: CodeExecutionMode.IoCheck },
    };

    const res = await http.post("/blocks/dry-run").set("Authorization", `Bearer ${ownerToken}`).send(dto);

    expect(res.status).toBe(400);
  });
});
