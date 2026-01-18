import { GradingStatus } from "@athena/types";

import { StudentProgress } from "../../../domain/student-progress.model";
import { BlockResult } from "../../../domain/value-objects/block-result.vo";
import { ProgressOrmEntity } from "../entities/progress.orm.entity";

export class ProgressMapper {
  static toDomain(entity: ProgressOrmEntity): StudentProgress {
    const completedBlocksDomain: Record<string, BlockResult> = {};

    if (entity.completedBlocks) {
      Object.entries(entity.completedBlocks).forEach(([blockId, rawData]) => {
        completedBlocksDomain[blockId] = new BlockResult(
          rawData.score,
          new Date(rawData.completedAt),
          rawData.status || GradingStatus.GRADED,
          rawData.submissionData,
          rawData.feedback,
        );
      });
    }

    return new StudentProgress({
      id: entity.id,
      enrollmentId: entity.enrollmentId,
      courseId: entity.courseId,
      studentId: entity.studentId,
      status: entity.status,
      currentScore: entity.currentScore,
      completedBlocks: completedBlocksDomain,
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
    entity.completedBlocks = domain.completedBlocks;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
