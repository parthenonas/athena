import { Permission, ProgrammingLanguage, CodeExecutionMode } from "@athena/types";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { BlockDryRunDto } from "../../src/content/block/dto/dry-run.dto";
import { SubmissionQueueService } from "../../src/submission-queue/submission-queue.service";
import { bootstrapE2E, shutdownE2E } from "../bootstrap-e2e";

describe("POST /blocks/dry-run (e2e)", () => {
  let app: INestApplication;
  let fixtures: any;
  let queueService: SubmissionQueueService;

  let allowedToken: string;
  let deniedToken: string;

  beforeAll(async () => {
    const res = await bootstrapE2E();
    app = res.app;
    fixtures = res.fixtures;

    queueService = app.get(SubmissionQueueService);

    await fixtures.resetDatabase();
    await fixtures.seedAdmin({ password: "Password123!" });

    // Юзер С правами на запуск кода
    const allowedRole = await fixtures.createRole({
      name: "dry_run_allowed",
      permissions: [Permission.BLOCKS_EXECUTE],
    });
    const allowedUser = await fixtures.createUser({
      login: "dry_allowed",
      password: "Password123!",
      roleId: allowedRole.id,
    });
    allowedToken = await fixtures.login(allowedUser.login, "Password123!");
    if (!allowedToken) throw new Error("Failed to login allowed user!");

    // Юзер БЕЗ прав на запуск кода
    const deniedRole = await fixtures.createRole({
      name: "dry_run_denied",
      permissions: [], // Пустые права
    });
    const deniedUser = await fixtures.createUser({
      login: "dry_denied",
      password: "Password123!",
      roleId: deniedRole.id,
    });
    deniedToken = await fixtures.login(deniedUser.login, "Password123!");
  }, 60000);

  afterAll(async () => {
    await fixtures.resetDatabase();
    await shutdownE2E(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow user with BLOCKS_EXECUTE to initiate dry run", async () => {
    const http = request(app.getHttpServer());

    const sendSpy = jest
      .spyOn(queueService, "sendForExecution")
      .mockResolvedValue({ submissionId: "test-uuid", status: "queued" });

    const dto: BlockDryRunDto = {
      socketId: "socket-abc-123",
      blockId: "blockId",
      content: {
        taskText: { json: {} },
        language: ProgrammingLanguage.Python,
        initialCode: "print('Hello E2E')",
        executionMode: CodeExecutionMode.IoCheck,
      },
    };

    const res = await http.post("/blocks/dry-run").set("Authorization", `Bearer ${allowedToken}`).send(dto);
    expect(res.status).toBe(202);

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          socketId: "socket-abc-123",
        }),
      }),
    );
  });

  it("should DENY access if user lacks BLOCKS_EXECUTE permission", async () => {
    const http = request(app.getHttpServer());
    const sendSpy = jest.spyOn(queueService, "sendForExecution");

    const dto: BlockDryRunDto = {
      socketId: "socket-hacker",
      blockId: "block-id",
      content: {
        taskText: { json: {} },
        language: ProgrammingLanguage.Python,
        initialCode: "print('hack')",
        executionMode: CodeExecutionMode.IoCheck,
      },
    };

    const res = await http.post("/blocks/dry-run").set("Authorization", `Bearer ${deniedToken}`).send(dto);

    expect(res.status).toBe(403);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("should validate DTO (require socketId)", async () => {
    const http = request(app.getHttpServer());

    const dto = {
      content: { language: ProgrammingLanguage.Python, initialCode: "x=1", executionMode: CodeExecutionMode.IoCheck },
    };

    const res = await http.post("/blocks/dry-run").set("Authorization", `Bearer ${allowedToken}`).send(dto);

    expect(res.status).toBe(400);
  });
});
