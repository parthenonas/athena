import { BaseBlockResult, GradingStatus, StudentLessonProgress } from "@athena/types";

import { StudentProgress } from "../../../domain/student-progress.model";
import { BlockResult } from "../../../domain/value-objects/block-result.vo";
import { ProgressOrmEntity } from "../entities/progress.orm.entity";

export class ProgressMapper {
  static toDomain(entity: ProgressOrmEntity): StudentProgress {
    const lessonsDomain: Record<string, StudentLessonProgress> = {};

    if (entity.lessons) {
      Object.entries(entity.lessons).forEach(([lessonId, rawLesson]) => {
        const completedBlocks: Record<string, BlockResult> = {};

        if (rawLesson.completedBlocks) {
          Object.entries(rawLesson.completedBlocks).forEach(([blockId, rawBlock]: [string, BaseBlockResult]) => {
            completedBlocks[blockId] = new BlockResult(
              rawBlock.score,
              new Date(rawBlock.completedAt),
              rawBlock.status || GradingStatus.GRADED,
              rawBlock.submissionData,
              rawBlock.feedback,
            );
          });
        }

        lessonsDomain[lessonId] = {
          status: rawLesson.status,
          completedBlocks: completedBlocks,
          createdAt: new Date(rawLesson.createdAt),
          updatedAt: new Date(rawLesson.updatedAt),
        };
      });
    }

    return new StudentProgress({
      id: entity.id,
      enrollmentId: entity.enrollmentId,
      courseId: entity.courseId,
      studentId: entity.studentId,
      status: entity.status,
      currentScore: entity.currentScore,
      lessons: lessonsDomain,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(domain: StudentProgress): ProgressOrmEntity {
    const entity = new ProgressOrmEntity();
    entity.id = domain.id;
    entity.enrollmentId = domain.enrollmentId;
    entity.courseId = domain.courseId;
    entity.studentId = domain.studentId;
    entity.status = domain.status;
    entity.currentScore = domain.currentScore;
    entity.lessons = domain.lessons;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
