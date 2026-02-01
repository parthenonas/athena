import { StudentSubmissionRequest, ProgrammingLanguage } from "@athena/types";
import { IsNotEmpty, IsString, IsEnum } from "class-validator";

/**
 * @class StudentSubmissionDto
 * @description
 * Data Transfer Object for validating student code submissions.
 * Implements the shared contract `StudentSubmissionRequest`.
 */
export class StudentSubmissionDto implements StudentSubmissionRequest {
  /**
   * The source code written by the student.
   * Must not be empty.
   */
  @IsString()
  @IsNotEmpty()
  code!: string;

  /**
   * The programming language of the submission.
   * Must be a valid value from the `ProgrammingLanguage` enum (e.g., 'javascript', 'python').
   */
  @IsEnum(ProgrammingLanguage)
  @IsNotEmpty()
  language!: ProgrammingLanguage;

  /**
   * The ID of the WebSocket socket.
   * Used to stream real-time execution logs back to the specific client client.
   */
  @IsString()
  @IsNotEmpty()
  socketId!: string;
}
