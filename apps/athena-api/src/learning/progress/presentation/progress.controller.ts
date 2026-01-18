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
import { GetStudentProgressQuery } from "../application/queries/get-student-progress.query";

@Controller("progress")
@UseGuards(JwtAuthGuard, AclGuard)
export class ProgressController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post(":courseId/submit/:blockId")
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission(Permission.ENROLLMENTS_READ)
  async submitAssignment(
    @Param("courseId") courseId: string,
    @Param("blockId") blockId: string,
    @Body() dto: StudentSubmissionDto,
    @CurrentUser("sub") userId: string,
  ): Promise<{ status: string }> {
    await this.commandBus.execute(new SubmitAssignmentCommand(userId, courseId, blockId, dto));
    return { status: "pending" };
  }

  @Post(":courseId/view/:blockId")
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.ENROLLMENTS_READ)
  async markAsViewed(
    @Param("courseId") courseId: string,
    @Param("blockId") blockId: string,
    @CurrentUser("sub") userId: string,
  ): Promise<{ status: string; score: number }> {
    const score = 100;

    await this.commandBus.execute(new CompleteBlockSyncCommand(userId, courseId, blockId, score));

    return { status: "completed", score };
  }

  @Get()
  @RequirePermission(Permission.ENROLLMENTS_READ)
  async getMyDashboard(@CurrentUser("sub") userId: string) {
    return this.queryBus.execute(new GetStudentDashboardQuery(userId));
  }

  @Get(":courseId")
  @RequirePermission(Permission.ENROLLMENTS_READ)
  async getMyProgress(@Param("courseId") courseId: string, @CurrentUser("sub") userId: string) {
    return this.queryBus.execute(new GetStudentProgressQuery(userId, courseId));
  }
}
