import { SortOrder } from "./common";

export interface CreateCourseRequest {
  title: string;
  description?: string;
  tags?: string[];
  isPublished?: boolean;
}

export interface FilterCourseRequest {
  search?: string;
  page: number;
  limit: number;
  sortBy: "title" | "createdAt" | "updatedAt";
  sortOrder: SortOrder;
}

export interface CourseResponse {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  tags: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  ownerId?: string;
  tags?: string[];
  isPublished?: boolean;
}
