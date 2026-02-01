import { GradingStatus, ProgressStatus } from "@athena/types";

import { ProgressMapper } from "./progress.mapper";
import { StudentProgress } from "../../../domain/student-progress.model";
import { BlockResult } from "../../../domain/value-objects/block-result.vo";
import { ProgressOrmEntity } from "../entities/progress.orm.entity";

describe("ProgressMapper", () => {
  const DATE = new Date("2026-01-01T00:00:00.000Z");

  const mockEntity = new ProgressOrmEntity();
  mockEntity.id = "p1";
  mockEntity.enrollmentId = "e1";
  mockEntity.courseId = "c1";
  mockEntity.studentId = "s1";
  mockEntity.status = ProgressStatus.IN_PROGRESS;
  mockEntity.currentScore = 100;
  mockEntity.createdAt = DATE;
  mockEntity.updatedAt = DATE;
  mockEntity.lessons = {
    l1: {
      status: ProgressStatus.COMPLETED,
      createdAt: DATE,
      updatedAt: DATE,
      completedBlocks: {
        b1: {
          score: 100,
          completedAt: DATE,
          status: GradingStatus.GRADED,
          feedback: "Good",
        } as any,
      },
    },
  };

  describe("toDomain", () => {
    it("should correctly rehydrate Entity to Aggregate", () => {
      const domain = ProgressMapper.toDomain(mockEntity);

      expect(domain).toBeInstanceOf(StudentProgress);
      expect(domain.id).toBe("p1");
      expect(domain.status).toBe(ProgressStatus.IN_PROGRESS);

      const block = domain.lessons["l1"].completedBlocks["b1"];

      expect(block).toBeInstanceOf(BlockResult);
      expect(block.score).toBe(100);
      expect(block.completedAt).toBeInstanceOf(Date);
    });
  });

  describe("toPersistence", () => {
    it("should correctly map Aggregate to Entity", () => {
      const domain = StudentProgress.create("p1", "e1", "c1", "s1");

      const entity = ProgressMapper.toPersistence(domain);

      expect(entity).toBeInstanceOf(ProgressOrmEntity);
      expect(entity.id).toBe("p1");
      expect(entity.status).toBe(ProgressStatus.NOT_STARTED);
      expect(entity.lessons).toEqual({});
    });
  });
});
