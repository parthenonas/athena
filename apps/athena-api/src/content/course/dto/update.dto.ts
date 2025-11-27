import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

/**
 * @class UpdateCourseDto
 * DTO for updating a Course.
 *
 * All fields optional.
 */
export class UpdateCourseDto {
  /** Optional new title. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  /** Updated description. */
  @IsOptional()
  @IsString()
  description?: string;

  /** Update course author (rare case). */
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  /** Updated tag list. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** Toggle publication. */
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
