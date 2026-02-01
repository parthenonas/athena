import { ProgrammingLanguage } from "@athena/types";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Test, TestingModule } from "@nestjs/testing";

import { ProgressController } from "./progress.controller";
import { JwtAuthGuard } from "../../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../../identity/acl/acl.guard";
import { CompleteBlockSyncCommand } from "../application/commands/complete-block-sync.command";
import { SubmitAssignmentCommand } from "../application/commands/submit-assignment.command";
import { StudentSubmissionDto } from "../application/dto/student-submission.dto";
import { GetStudentDashboardQuery } from "../application/queries/get-student-dashboard.query";
import { GetStudentProgressQuery } from "../application/queries/get-student-progress.query";

const mockCommandBus = {
  execute: jest.fn(),
};

const mockQueryBus = {
  execute: jest.fn(),
};

describe("ProgressController", () => {
  let controller: ProgressController;

  const USER_ID = "user-123";
  const COURSE_ID = "course-123";
  const LESSON_ID = "lesson-1";
  const BLOCK_ID = "block-1";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    })

      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AclGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProgressController>(ProgressController);

    jest.clearAllMocks();
  });

  describe("submitAssignment (POST .../submit)", () => {
    it("should dispatch SubmitAssignmentCommand and return pending status", async () => {
      const dto: StudentSubmissionDto = {
        code: "console.log('hi')",
        language: ProgrammingLanguage.Python,
        socketId: "socket-1",
      };

      const result = await controller.submitAssignment(COURSE_ID, LESSON_ID, BLOCK_ID, dto, USER_ID);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new SubmitAssignmentCommand(USER_ID, COURSE_ID, LESSON_ID, BLOCK_ID, dto),
      );
      expect(result).toEqual({ status: "pending" });
    });
  });

  describe("markAsViewed (POST .../view)", () => {
    it("should dispatch CompleteBlockSyncCommand with score 100", async () => {
      const result = await controller.markAsViewed(COURSE_ID, LESSON_ID, BLOCK_ID, USER_ID);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new CompleteBlockSyncCommand(USER_ID, COURSE_ID, LESSON_ID, BLOCK_ID, 100),
      );
      expect(result).toEqual({ status: "completed", score: 100 });
    });
  });

  describe("getMyDashboard (GET /)", () => {
    it("should execute GetStudentDashboardQuery", async () => {
      const mockResult = [{ title: "React" }];
      mockQueryBus.execute.mockResolvedValue(mockResult);

      const result = await controller.getMyDashboard(USER_ID);

      expect(mockQueryBus.execute).toHaveBeenCalledWith(new GetStudentDashboardQuery(USER_ID));
      expect(result).toEqual(mockResult);
    });
  });

  describe("getMyProgress (GET /:courseId)", () => {
    it("should execute GetStudentProgressQuery", async () => {
      const mockResult = { courseId: COURSE_ID, percentage: 50 };
      mockQueryBus.execute.mockResolvedValue(mockResult);

      const result = await controller.getMyProgress(COURSE_ID, USER_ID);

      expect(mockQueryBus.execute).toHaveBeenCalledWith(new GetStudentProgressQuery(USER_ID, COURSE_ID));
      expect(result).toEqual(mockResult);
    });
  });
});
