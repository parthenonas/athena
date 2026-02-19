import { BlockRequiredAction, BlockType, CodeBlockContent, GradingStatus, QuizBlockContent } from "@athena/types";
import { Inject, NotFoundException, Logger } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { plainToInstance } from "class-transformer";

import { ContentService } from "../../../../../content/content.service";
import { BlockView } from "../../../../../content/lesson/schemas/lesson-view.schema";
import { PROGRESS_REPOSITORY, type IProgressRepository } from "../../../domain/repository/progress.repository";
import { StudentProgress } from "../../../domain/student-progress.model";
import { StudentLessonViewDto } from "../../dto/student-lesson-view.dto";
import { GetStudentLessonQuery } from "../get-student-lesson.query";

@QueryHandler(GetStudentLessonQuery)
export class GetStudentLessonHandler implements IQueryHandler<GetStudentLessonQuery> {
  private readonly logger = new Logger(GetStudentLessonHandler.name);

  constructor(
    private readonly contentService: ContentService,
    @Inject(PROGRESS_REPOSITORY)
    private readonly progressRepo: IProgressRepository,
  ) {}

  async execute(query: GetStudentLessonQuery): Promise<StudentLessonViewDto> {
    const { userId, courseId, lessonId } = query;
    this.logger.debug(`Fetching lesson ${lessonId} for user ${userId}`);

    const rawLessonView = await this.contentService.getLessonViewInternal(lessonId);

    if (rawLessonView.courseId !== courseId) {
      throw new NotFoundException("Lesson not found in this course");
    }

    const progress: StudentProgress | null = await this.progressRepo.findByUserAndCourse(userId, courseId);

    const visibleBlocks: Record<string, unknown>[] = [];
    const totalBlocksCount = rawLessonView.blocks.length;

    for (const block of rawLessonView.blocks) {
      const blockProgress = progress?.lessons?.[lessonId]?.completedBlocks?.[block.blockId];

      const isGraded = blockProgress?.status === GradingStatus.GRADED;
      const score = blockProgress?.score || 0;

      let isCompleted = false;
      if (block.requiredAction === BlockRequiredAction.PASS || block.requiredAction === BlockRequiredAction.SUBMIT) {
        isCompleted = isGraded && score > 0;
      } else {
        isCompleted = isGraded;
      }

      const safeBlock = this.stripSecrets(block);

      safeBlock.progress = blockProgress
        ? {
            status: blockProgress.status,
            score: blockProgress.score,
            feedback: blockProgress.feedback,
            submittedAt: blockProgress.completedAt,
          }
        : null;

      visibleBlocks.push(safeBlock);

      if (!isCompleted && block.requiredAction !== BlockRequiredAction.VIEW) {
        this.logger.debug(`Truncating lesson ${lessonId} at block ${block.blockId} (Action: ${block.requiredAction})`);
        break;
      }
    }

    return plainToInstance(
      StudentLessonViewDto,
      {
        lessonId: rawLessonView.lessonId,
        courseId: rawLessonView.courseId,
        title: rawLessonView.title,
        goals: rawLessonView.goals,
        totalBlocks: totalBlocksCount,
        visibleBlocksCount: visibleBlocks.length,
        blocks: visibleBlocks,
      },
      { excludeExtraneousValues: false },
    );
  }

  private stripSecrets(block: BlockView): Record<string, unknown> {
    const type = block.type;

    if (type === BlockType.Code) {
      const content = block.content as CodeBlockContent;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { testCasesCode, outputData, ...safeContent } = content;

      return {
        ...block,
        content: safeContent,
      };
    }

    if (type === BlockType.Quiz) {
      const content = block.content as QuizBlockContent;

      const safeQuestions = content.questions.map(q => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { correctAnswerText, options, ...safeQuestion } = q;

        const safeOptions = options?.map(opt => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { isCorrect, ...safeOption } = opt;
          return safeOption;
        });

        return {
          ...safeQuestion,
          options: safeOptions,
        };
      });

      return {
        ...block,
        content: {
          ...content,
          questions: safeQuestions,
        },
      };
    }

    return { ...block };
  }
}
