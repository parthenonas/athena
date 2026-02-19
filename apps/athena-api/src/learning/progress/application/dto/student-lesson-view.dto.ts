import {
  BlockRequiredAction,
  BlockType,
  GradingStatus,
  BlockProgressState,
  SanitizedBlockView,
  StudentLessonView,
} from "@athena/types";
import { Expose, Type } from "class-transformer";

/**
 * @class BlockProgressDto
 * @description Represents student's progress for a specific block.
 */
export class BlockProgressDto implements BlockProgressState {
  @Expose()
  status!: GradingStatus;

  @Expose()
  score!: number;

  @Expose()
  feedback?: string;

  @Expose()
  @Type(() => Date)
  submittedAt?: Date;
}

/**
 * @class SanitizedBlockViewDto
 * @description Sanitized block data for student consumption (no secrets).
 */
export class SanitizedBlockViewDto implements SanitizedBlockView {
  @Expose()
  blockId!: string;

  @Expose()
  type!: BlockType;

  @Expose()
  orderIndex!: number;

  @Expose()
  requiredAction!: BlockRequiredAction;

  @Expose()
  content!: Record<string, unknown>;

  @Expose()
  @Type(() => BlockProgressDto)
  progress!: BlockProgressDto | null;
}

/**
 * @class StudentLessonViewDto
 * @description Aggregated lesson content with progressive disclosure logic.
 */
export class StudentLessonViewDto implements StudentLessonView {
  @Expose()
  lessonId!: string;

  @Expose()
  courseId!: string;

  @Expose()
  title!: string;

  @Expose()
  goals?: string | null;

  @Expose()
  totalBlocks!: number;

  @Expose()
  visibleBlocksCount!: number;

  @Expose()
  @Type(() => SanitizedBlockViewDto)
  blocks!: SanitizedBlockViewDto[];
}
