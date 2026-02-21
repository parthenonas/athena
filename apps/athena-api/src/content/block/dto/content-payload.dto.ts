import {
  CodeBlockContent,
  CodeExecutionMode,
  ProgrammingLanguage,
  QuizExamContent,
  QuizOption,
  QuizQuestionContent,
  QuizQuestionType,
  TextBlockContent,
} from "@athena/types";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

/**
 * @class TextBlockContentDto
 * @description Payload for rich text blocks using Tiptap/ProseMirror JSON structure.
 */
export class TextBlockContentDto implements TextBlockContent {
  /**
   * The JSON output from the Tiptap editor.
   * Stored as a raw object to preserve nested ProseMirror structure.
   */
  @IsNotEmpty()
  json!: Record<string, unknown>;
}

/**
 * @class CodeBlockContentDto
 * @description Payload for executable code snippets/exercises.
 */
export class CodeBlockContentDto implements CodeBlockContent {
  /**
   * The programming language for syntax highlighting and execution runner.
   */
  @IsEnum(ProgrammingLanguage)
  language!: ProgrammingLanguage;

  /**
   * The task text.
   */
  @IsObject()
  @ValidateNested()
  @Type(() => TextBlockContentDto)
  taskText!: TextBlockContentDto;

  /**
   * The boilerplate code visible to the student when they start.
   */
  @IsOptional()
  @IsString()
  initialCode?: string;

  /**
   * Execution strategy.
   * Determines how the code will be validated (IO check vs Unit Tests).
   * Defaults to IoCheck.
   */
  @IsOptional()
  @IsEnum(CodeExecutionMode)
  executionMode: CodeExecutionMode = CodeExecutionMode.IoCheck;

  /**
   * Hidden unit tests code.
   * Required ONLY if executionMode is UnitTest.
   */
  @ValidateIf(o => o.executionMode === CodeExecutionMode.UnitTest)
  @IsOptional()
  @IsString()
  testCasesCode?: string;

  /**
   * Standard input (stdin) data to be passed to the program.
   * Required ONLY if executionMode is IoCheck.
   */
  @ValidateIf(o => o.executionMode === CodeExecutionMode.IoCheck)
  @IsOptional()
  @IsString()
  inputData?: string;

  /**
   * Expected standard output (stdout).
   * If provided in IoCheck mode, strict equality check is performed.
   * If empty in IoCheck mode, the block acts as a playground (no validation).
   */
  @ValidateIf(o => o.executionMode === CodeExecutionMode.IoCheck)
  @IsOptional()
  @IsString()
  outputData?: string;

  /**
   * Execution time limit in seconds.
   * Default: 5s
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimit: number = 5;

  /**
   * Execution memory limit in megabytes.
   * Default: 128MB
   */
  @IsOptional()
  @IsInt()
  @Min(16)
  memoryLimit: number = 128;
}

/**
 * @class QuizOptionDto
 * @description Represents a single answer choice in a quiz question.
 */
export class QuizOptionDto implements QuizOption {
  /**
   * Unique ID of the option (generated on frontend usually).
   */
  @IsUUID()
  id!: string;

  /**
   * The text of the answer.
   */
  @IsString()
  @IsNotEmpty()
  text!: string;

  /**
   * Indicates if this option is the correct answer.
   * @warning Should be excluded via serialization groups when sending to students.
   */
  @IsBoolean()
  isCorrect!: boolean;
}

/**
 * @class QuizQuestionContentDto
 * @description Payload for a single quiz question block (quiz_question).
 */
export class QuizQuestionContentDto implements QuizQuestionContent {
  /**
   * The question text.
   */
  @IsObject()
  @ValidateNested()
  @Type(() => TextBlockContentDto)
  question!: TextBlockContentDto;

  /**
   * Type of the question (Single choice, Multiple choice, Open text).
   */
  @IsEnum(QuizQuestionType)
  type!: QuizQuestionType;

  /**
   * List of options. Required for Single/Multiple types.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options?: QuizOptionDto[];

  /**
   * Regex or exact string match for Open questions.
   */
  @IsOptional()
  @IsString()
  correctAnswerText?: string;

  @IsOptional()
  @IsString()
  explanation?: string;
}

/**
 * @class QuizExamSourceDto
 * @description Configuration for where to pull questions from for an exam.
 */
class QuizExamSourceDto {
  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsInt()
  @Min(1)
  count!: number;
}

/**
 * @class QuizExamContentDto
 * @description Configuration payload for generating a quiz attempt (quiz_exam).
 */
export class QuizExamContentDto implements QuizExamContent {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  /**
   * The percentage (0-100) required to pass this quiz.
   */
  @IsNumber()
  @Min(0)
  @Max(100)
  passPercentage!: number;

  @IsObject()
  @ValidateNested()
  @Type(() => QuizExamSourceDto)
  source!: QuizExamSourceDto;
}
