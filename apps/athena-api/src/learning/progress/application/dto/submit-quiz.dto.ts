import { CheckQuizQuestionRequest } from "@athena/types";
import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";

export class SubmitQuizDto implements CheckQuizQuestionRequest {
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  selectedOptionIds?: string[];

  @IsOptional()
  @IsString()
  textAnswer?: string;
}
