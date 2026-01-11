import { SortOrder } from "./common";

/**
 * Payload for creating a new Instructor profile.
 */
export interface CreateInstructorRequest {
  accountId: string;
  bio?: string | null;
  title?: string | null;
}

/**
 * Payload for updating instructor details.
 * Account ID cannot be changed.
 */
export interface UpdateInstructorRequest {
  bio?: string | null;
  title?: string | null;
}

/**
 * Response shape for an Instructor entity.
 */
export interface InstructorResponse {
  id: string;
  accountId: string;
  bio: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query parameters for filtering instructors.
 */
export interface FilterInstructorRequest {
  accountId?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy: "createdAt" | "title";
  sortOrder: SortOrder;
}
