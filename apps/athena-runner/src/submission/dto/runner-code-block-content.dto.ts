import { CodeBlockContent, ProgrammingLanguage, CodeExecutionMode, type TextBlockContent } from "@athena/types";
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsObject } from "class-validator";

/**
 * @class RunnerCodeBlockContentDto
 * DTO for validating the executable content structure received from the main API.
 * This DTO is nested within RunnerJobDataDto.
 */
export class RunnerCodeBlockContentDto implements CodeBlockContent {
  /** Programming language (e.g., 'python', 'javascript'). */
  @IsNotEmpty()
  language!: ProgrammingLanguage;

  /** Task text */
  @IsObject()
  taskText: TextBlockContent;

  /** The source code to be compiled or executed. */
  @IsString()
  @IsNotEmpty()
  initialCode!: string;

  /** The execution mode: 'io_check' (input/output comparison) or 'unit_test'. */
  @IsNotEmpty()
  executionMode!: CodeExecutionMode;

  /** Standard input (stdin) to be passed to the program. */
  @IsString()
  @IsOptional()
  inputData?: string;

  /** Expected output (stdout) for comparison in 'io_check' mode. */
  @IsString()
  @IsOptional()
  outputData?: string;

  /** Unit test code (for 'unit_test' mode). */
  @IsString()
  @IsOptional()
  testCasesCode?: string;

  /** CPU time limit for execution, in seconds. */
  @IsNumber()
  @IsOptional()
  timeLimit?: number;

  /** Memory limit for execution, in megabytes. */
  @IsNumber()
  @IsOptional()
  memoryLimit?: number;
}
