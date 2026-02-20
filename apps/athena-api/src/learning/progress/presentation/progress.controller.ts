import { Permission } from "@athena/types";
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";

import { JwtAuthGuard } from "../../../identity/account/guards/jwt.guard";
import { AclGuard } from "../../../identity/acl/acl.guard";
import { RequirePermission } from "../../../identity/acl/decorators/require-permission.decorator";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { CompleteBlockSyncCommand } from "../application/commands/complete-block-sync.command";
import { SubmitAssignmentCommand } from "../application/commands/submit-assignment.command";
import { StudentSubmissionDto } from "../application/dto/student-submission.dto";
import { GetStudentDashboardQuery } from "../application/queries/get-student-dashboard.query";
import { GetStudentLessonQuery } from "../application/queries/get-student-lesson.query";
import { GetStudentProgressQuery } from "../application/queries/get-student-progress.query";

/**
 * @class ProgressController
 * @description
 * The HTTP entry point for Student Progress operations.
 *
 * Architecture Role:
 * - Acts as an Adapter layer.
 * - Converts HTTP Requests -> Domain Commands/Queries.
 * - Delegates all logic to the CQRS CommandBus/QueryBus.
 *
 * Security:
 * - Protected by JWT (Authentication).
 * - Protected by ACL (Authorization via `ENROLLMENTS_READ` permission).
 */
@Controller("progress")
@UseGuards(JwtAuthGuard, AclGuard)
export class ProgressController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Async Submission (Code Challenge).
   * Returns 202 Accepted because the grading happens in the background (Saga -> Runner).
   */
  @Post(":courseId/lessons/:lessonId/blocks/:blockId/submit")
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission(Permission.ENROLLMENTS_READ)
  async submitAssignment(
    @Param("courseId") courseId: string,
    @Param("lessonId") lessonId: string,
    @Param("blockId") blockId: string,
    @Body() dto: StudentSubmissionDto,
    @CurrentUser("sub") userId: string,
  ): Promise<{ status: string }> {
    await this.commandBus.execute(new SubmitAssignmentCommand(userId, courseId, lessonId, blockId, dto));
    return { status: "pending" };
  }

  /**
   * Sync Completion (Video, Text).
   * Returns 200 OK because the score is calculated immediately (100%).
   */
  @Post(":courseId/lessons/:lessonId/blocks/:blockId/view")
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.ENROLLMENTS_READ)
  async markAsViewed(
    @Param("courseId") courseId: string,
    @Param("lessonId") lessonId: string,
    @Param("blockId") blockId: string,
    @CurrentUser("sub") userId: string,
  ): Promise<{ status: string; score: number }> {
    const score = 100;

    await this.commandBus.execute(new CompleteBlockSyncCommand(userId, courseId, lessonId, blockId, score));

    return { status: "completed", score };
  }

  /**
   * Fetches the main dashboard (List of enrolled courses with high-level stats).
   */
  @Get()
  @RequirePermission(Permission.ENROLLMENTS_READ)
  async getMyDashboard(@CurrentUser("sub") userId: string) {
    return this.queryBus.execute(new GetStudentDashboardQuery(userId));
  }

  /**
   * Fetches the detailed map of a specific course (Lessons, Blocks, Statuses).
   */
  @Get(":courseId")
  @RequirePermission(Permission.ENROLLMENTS_READ)
  async getMyProgress(@Param("courseId") courseId: string, @CurrentUser("sub") userId: string) {
    return this.queryBus.execute(new GetStudentProgressQuery(userId, courseId));
  }

  /**
   * Fetches the detailed map of a specific course (Lessons, Blocks, Statuses).
   */
  @Get(":courseId/lesson/:lessonId")
  @RequirePermission(Permission.ENROLLMENTS_READ)
  async getLesson(
    @Param("courseId") courseId: string,
    @Param("lessonId") lessonId: string,
    @CurrentUser("sub") userId: string,
  ) {
    return this.queryBus.execute(new GetStudentLessonQuery(userId, courseId, lessonId));
  }
}
