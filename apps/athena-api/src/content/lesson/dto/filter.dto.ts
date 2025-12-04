import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

/**
 * @class FilterLessonDto
 * Query parameters for listing and filtering lessons.
 */
export class FilterLessonDto {
  /**
   * Filter lessons by specific Course ID.
   * This is the most common filter, as lessons are rarely fetched globally.
   */
  @IsOptional()
  @IsUUID()
  courseId?: string;

  /**
   * Pagination: Page number (1-based).
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page: number = 1;

  /**
   * Pagination: Items per page.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit: number = 20;

  /**
   * Search term for filtering by title.
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Field to sort by. Defaults to 'order'.
   */
  @IsOptional()
  @IsString()
  sortBy: string = "order";

  /**
   * Sort direction: 'ASC' or 'DESC'.
   */
  @IsOptional()
  @IsEnum(["ASC", "DESC"])
  sortOrder: "ASC" | "DESC" = "ASC";
}
