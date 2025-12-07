import {
  CodeBlockContent,
  ImageBlockContent,
  ProgrammingLanguage,
  QuizContent,
  QuizOption,
  QuizQuestion,
  QuizQuestionType,
  SurveyQuestion,
  SurveyQuestionType,
  TextBlockContent,
  VideoBlockContent,
  CodeExecutionMode,
} from "@athena/types";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
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
 * @class VideoBlockContentDto
 * @description Payload for video content, typically stored in S3/MinIO.
 */
export class VideoBlockContentDto implements VideoBlockContent {
  /**
   * The internal UUID of the file record in the `files` table.
   * Used to maintain referential integrity (prevent GC from deleting the file).
   */
  @IsUUID()
  @IsNotEmpty()
  fileId!: string;

  /**
   * The public or presigned URL to stream the video.
   */
  @IsUrl()
  @IsNotEmpty()
  url!: string;

  /**
   * MIME type of the video file (e.g., 'video/mp4').
   */
  @IsOptional()
  @IsString()
  mimeType?: string;

  /**
   * File size in bytes.
   */
  @IsOptional()
  @IsNumber()
  size?: number;

  /**
   * Duration of the video in seconds.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}

/**
 * @class ImageBlockContentDto
 * @description Payload for image content.
 */
export class ImageBlockContentDto implements ImageBlockContent {
  /**
   * The internal UUID of the file record.
   */
  @IsUUID()
  @IsNotEmpty()
  fileId!: string;

  /**
   * The public URL to display the image.
   */
  @IsUrl()
  @IsNotEmpty()
  url!: string;

  /**
   * MIME type (e.g., 'image/jpeg', 'image/png').
   */
  @IsOptional()
  @IsString()
  mimeType?: string;

  /**
   * Optional caption text displayed below the image.
   */
  @IsOptional()
  @IsString()
  caption?: string;

  /**
   * Intrinsic width of the image (to prevent layout shifts).
   */
  @IsOptional()
  @IsNumber()
  width?: number;

  /**
   * Intrinsic height of the image.
   */
  @IsOptional()
  @IsNumber()
  height?: number;
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
   * The boilerplate code visible to the student when they start.
   */
  @IsString()
  @IsNotEmpty()
  initialCode!: string;

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
  @IsString()
  @IsNotEmpty()
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
 * @description Represents a single answer choice in a quiz.
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
 * @class QuizQuestionDto
 * @description A single question within a Quiz block.
 */
export class QuizQuestionDto implements QuizQuestion {
  /**
   * The question text.
   */
  @IsString()
  @IsNotEmpty()
  question!: string;

  /**
   * Type of the question (Single choice, Multiple choice, Open text).
   */
  @IsEnum(QuizQuestionType)
  type!: QuizQuestionType;

  /**
   * List of options. Required for Single/Multiple types.
   */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options?: QuizOptionDto[];

  /**
   * Regex or exact string match for Open questions.
   */
  @IsOptional()
  @IsString()
  correctAnswerText?: string;
}

/**
 * @class QuizContentDto
 * @description Top-level payload for a Quiz Block. Can contain multiple questions.
 */
export class QuizContentDto implements QuizContent {
  /**
   * List of questions in this quiz block.
   */
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions!: QuizQuestionDto[];

  /**
   * The percentage (0-100) required to pass this quiz.
   */
  @IsNumber()
  @Min(0)
  @Max(100)
  passPercentage!: number;
}

/**
 * @class SurveyQuestionDto
 * @description Represents a question in a survey/feedback form.
 */
export class SurveyQuestionDto implements SurveyQuestion {
  /**
   * The question text.
   */
  @IsString()
  @IsNotEmpty()
  question!: string;

  /**
   * Type of survey input (Rating stars, Open text, etc.).
   */
  @IsEnum(SurveyQuestionType)
  type!: SurveyQuestionType;

  /**
   * Predefined options for Single/Multiple choice survey questions.
   */
  @IsOptional()
  @IsString({ each: true })
  options?: string[];
}
