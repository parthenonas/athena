import { SortOrder } from "./common";

export interface CreateLessonRequest {
  courseId: string;
  title: string;
  goals?: string;
  order?: number;
  isDraft?: boolean;
}

export interface FilterLessonRequest {
  courseId?: string;
  page: number;
  limit: number;
  search?: string;
  sortBy: string;
  sortOrder: SortOrder;
}

export interface LessonResponse {
  id: string;
  courseId: string;
  title: string;
  goals: string | null;
  order: number;
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UpdateLessonRequest = Partial<CreateLessonRequest>;
