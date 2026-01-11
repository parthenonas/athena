import { CreateInstructorRequest } from "@athena/types";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/**
 * @class CreateInstructorDto
 * DTO for creating an instructor profile.
 * Links an existing system account to the instructor role.
 */
export class CreateInstructorDto implements CreateInstructorRequest {
  /**
   * System Account UUID.
   */
  @IsUUID()
  accountId!: string;

  /**
   * Biography or short description.
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string | null;

  /**
   * Academic title (e.g., "PhD", "Senior Lecturer").
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string | null;
}
