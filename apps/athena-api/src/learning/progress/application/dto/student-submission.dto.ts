import { StudentSubmissionRequest, ProgrammingLanguage } from "@athena/types";
import { IsNotEmpty, IsString, IsEnum } from "class-validator";

export class StudentSubmissionDto implements StudentSubmissionRequest {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsEnum(ProgrammingLanguage)
  @IsNotEmpty()
  language!: ProgrammingLanguage;

  @IsString()
  @IsNotEmpty()
  socketId!: string;
}
