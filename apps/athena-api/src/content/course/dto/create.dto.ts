import { IsArray, IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

/**
 * @class CreateCourseDto
 * DTO for creating a new Course.
 *
 * Contains:
 * - title (required)
 * - optional description
 * - ownerId (required)
 * - array of tags
 * - isPublished (default: false)
 */
export class CreateCourseDto {
  /** Human-readable title of the course. */
  @IsString()
  @MinLength(2)
  title!: string;

  /** Optional course description. */
  @IsOptional()
  @IsString()
  description?: string;

  /** Tags for filtering and organization. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** Publication flag. */
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = false;
}
