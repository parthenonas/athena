export enum BlockType {
  Text = "text",
  Video = "video",
  Image = "image",
  Code = "code",
  Quiz = "quiz",
  Survey = "survey",
}

export enum ProgrammingLanguage {
  Python = "python",
  JavaScript = "javascript",
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
  testCasesCode: string;
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

export interface SurveyQuestion {
  question: string;
  type: SurveyQuestionType;
  options?: string[];
}
