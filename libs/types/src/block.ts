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
  taskText: TextBlockContent;
  initialCode?: string;
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

export interface QuizBlockContent {
  questions: QuizQuestion[];
  passPercentage: number;
}

export interface SurveyBlockContent {
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
  content: BlockContent;
  orderIndex?: number;
  requiredAction?: BlockRequiredAction;
}

export interface BlockDryRunRequest {
  lessonId: string;
  content: CodeBlockContent;
  socketId: string;
  blockId: string;
}

export interface BlockResponse {
  id: string;
  lessonId: string;
  type: BlockType;
  requiredAction: BlockRequiredAction;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TextBlockResponse extends BlockResponse {
  content: TextBlockContent;
}

export interface CodeBlockResponse extends BlockResponse {
  content: CodeBlockContent;
}

export interface QuizBlockResponse extends BlockResponse {
  content: QuizBlockContent;
}

export interface SurveyBlockResponse extends BlockResponse {
  content: SurveyBlockContent;
}

export type UpdateBlockRequest = Partial<CreateBlockRequest>;

export type BlockContent = CodeBlockContent | TextBlockContent | QuizBlockContent | SurveyBlockContent;
