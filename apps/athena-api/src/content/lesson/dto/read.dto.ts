import { Exclude, Expose } from "class-transformer";

/**
 * @class ReadLessonDto
 * Response DTO representing a Lesson.
 * Excludes sensitive or internal database fields.
 */
@Exclude()
export class ReadLessonDto {
  @Expose()
  id!: string;

  @Expose()
  courseId!: string;

  @Expose()
  title!: string;

  @Expose()
  goals!: string | null;

  @Expose()
  order!: number;

  @Expose()
  isDraft!: boolean;

  // Blocks will be exposed here once the Block module is implemented.
  // @Expose()
  // blocks?: ReadBlockDto[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
