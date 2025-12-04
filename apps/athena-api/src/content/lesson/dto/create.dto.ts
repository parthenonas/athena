import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";

/**
 * @class CreateLessonDto
 * Data transfer object for creating a new Lesson.
 */
export class CreateLessonDto {
  /**
   * The UUID of the parent Course.
   * Required to associate the lesson with a specific course.
   */
  @IsUUID()
  @IsNotEmpty()
  courseId!: string;

  /**
   * The title of the lesson.
   * Must be at least 3 characters long.
   */
  @IsString()
  @MinLength(3)
  title!: string;

  /**
   * Optional learning goals or description.
   */
  @IsOptional()
  @IsString()
  goals?: string;

  /**
   * Explicit order index.
   * If omitted, the service should automatically append the lesson to the end of the list.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  /**
   * Initial draft status.
   * Defaults to true (draft) in the entity if omitted.
   */
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}
