import { PartialType } from "@nestjs/mapped-types";

import { CreateLessonDto } from "./create.dto";

/**
 * @class UpdateLessonDto
 * DTO for updating an existing Lesson.
 *
 * Inherits all fields from CreateLessonDto as optional.
 * Note: moving a lesson between courses (updating courseId) is typically
 * handled via a specific 'move' operation, but permitted here if needed.
 */
export class UpdateLessonDto extends PartialType(CreateLessonDto) {}
