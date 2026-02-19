import {
  BlockRequiredAction,
  BlockType,
  GradingStatus,
  BlockProgressState,
  SanitizedBlockView,
  StudentLessonView,
} from "@athena/types";
import { Type } from "class-transformer";
import { IsArray, IsDate, IsEnum, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

/**
 * @class BlockProgressDto
 * @description
 * Data Transfer Object representing a student's progress for a single content block.
 * Implements the shared contract `BlockProgressState`.
 */
export class BlockProgressDto implements BlockProgressState {
  /**
   * The current grading status of the block.
   * Must be a valid value from the `GradingStatus` enum (e.g., PENDING, GRADED).
   */
  @IsEnum(GradingStatus)
  status!: GradingStatus;

  /**
   * The numerical score achieved by the student.
   * Typically 0 to 100.
   */
  @IsNumber()
  score!: number;

  /**
   * Optional feedback provided by the auto-grader, tests, or instructor.
   */
  @IsOptional()
  @IsString()
  feedback?: string;

  /**
   * Optional timestamp indicating when the submission was recorded.
   */
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  submittedAt?: Date;
}

/**
 * @class SanitizedBlockViewDto
 * @description
 * Data Transfer Object for a single content block, sanitized for the student.
 * Guarantees that sensitive data (like correct answers or hidden test cases) is stripped.
 * Implements the shared contract `SanitizedBlockView`.
 */
export class SanitizedBlockViewDto implements SanitizedBlockView {
  /**
   * The unique identifier of the block.
   */
  @IsString()
  blockId!: string;

  /**
   * The type of content block (e.g., Text, Video, Code, Quiz).
   * Determines how the polymorphic `content` payload should be parsed on the frontend.
   */
  @IsEnum(BlockType)
  type!: BlockType;

  /**
   * The sequential position of the block within the lesson.
   */
  @IsNumber()
  orderIndex!: number;

  /**
   * The action required from the student to complete this block.
   * Used by the frontend to render the appropriate UI (e.g., a "Next" button vs a "Submit" form).
   */
  @IsEnum(BlockRequiredAction)
  requiredAction!: BlockRequiredAction;

  /**
   * The polymorphic, sanitized content payload.
   * Structure heavily depends on the `type` property.
   */
  @IsObject()
  content!: Record<string, unknown>;

  /**
   * The student's current progress on this specific block.
   * Will be `null` if the student hasn't interacted with it yet.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => BlockProgressDto)
  progress!: BlockProgressDto | null;
}

/**
 * @class StudentLessonViewDto
 * @description
 * Data Transfer Object representing the aggregated lesson view for a student.
 * Includes sanitized blocks and applies progressive disclosure logic (truncating future locked blocks).
 * Implements the shared contract `StudentLessonView`.
 */
export class StudentLessonViewDto implements StudentLessonView {
  /**
   * The unique identifier of the lesson.
   */
  @IsString()
  lessonId!: string;

  /**
   * The unique identifier of the parent course.
   */
  @IsString()
  courseId!: string;

  /**
   * The human-readable title of the lesson.
   */
  @IsString()
  title!: string;

  /**
   * Optional learning objectives or description of the lesson.
   */
  @IsOptional()
  @IsString()
  goals?: string | null;

  /**
   * The total number of blocks in the full lesson.
   * Useful for rendering global progress bars (e.g., "Completed 3 of 10 steps").
   */
  @IsNumber()
  totalBlocks!: number;

  /**
   * The number of blocks currently visible to the student in the response payload.
   * May be less than `totalBlocks` due to progressive disclosure (truncation).
   */
  @IsNumber()
  visibleBlocksCount!: number;

  /**
   * The list of sanitized and visible blocks available to the student right now.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SanitizedBlockViewDto)
  blocks!: SanitizedBlockViewDto[];
}
