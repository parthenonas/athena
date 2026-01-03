export enum BlockType {
  Text = "text",
  Video = "video",
  Image = "image",
  Code = "code",
  Quiz = "quiz",
  Survey = "survey",
}

export enum CodeExecutionMode {
  IoCheck = "io_check",
  UnitTest = "unit_test",
}

export enum ProgrammingLanguage {
  Python = "python",
  SQL = "sql",
}

export enum QuizQuestionType {
  Single = "single",
  Multiple = "multiple",
  Open = "open",
}

export enum SurveyQuestionType {
  Rating = "rating",
  Open = "open",
  Single = "single",
  Multiple = "multiple",
}

export interface TextBlockContent {
  json: Record<string, unknown>;
}

export interface VideoBlockContent {
  fileId: string;
  url: string;
  mimeType?: string;
  size?: number;
  duration?: number;
}

export interface ImageBlockContent {
  fileId: string;
  url: string;
  mimeType?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface CodeBlockContent {
  language: ProgrammingLanguage;
  initialCode: string;
  executionMode: CodeExecutionMode;
  inputData?: string;
  outputData?: string;
  testCasesCode?: string;
  timeLimit?: number;
  memoryLimit?: number;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  question: string;
  type: QuizQuestionType;
  options?: QuizOption[];
  correctAnswerText?: string;
}

export interface QuizContent {
  questions: QuizQuestion[];
  passPercentage: number;
}

export interface SurveyContent {
  questions: SurveyQuestion[];
}

export interface SurveyOption {
  id: string;
  text: string;
}

export interface SurveyQuestion {
  question: string;
  type: SurveyQuestionType;
  options?: SurveyOption[];
}

export enum BlockRequiredAction {
  VIEW = "view",
  INTERACT = "interact",
  SUBMIT = "submit",
  PASS = "pass",
}

export interface CreateBlockRequest {
  lessonId: string;
  type: BlockType;
  content: Record<string, unknown>;
  orderIndex?: number;
  requiredAction?: BlockRequiredAction;
}

export interface BlockDryRunRequest {
  lessonId: string;
  content: CodeBlockContent;
  socketId: string;
}

export interface BlockResponse {
  id: string;
  lessonId: string;
  type: BlockType;
  content: {
    json: Record<string, unknown>;
  };
  requiredAction: BlockRequiredAction;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export type UpdateBlockRequest = Partial<CreateBlockRequest>;
