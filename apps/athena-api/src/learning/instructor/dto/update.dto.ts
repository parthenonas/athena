import { UpdateInstructorRequest } from "@athena/types";
import { IsOptional, IsString, MaxLength } from "class-validator";

/**
 * @class UpdateInstructorDto
 * DTO for updating instructor profile details.
 */
export class UpdateInstructorDto implements UpdateInstructorRequest {
  /**
   * Updated biography.
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string | null;

  /**
   * Updated academic title.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string | null;
}
