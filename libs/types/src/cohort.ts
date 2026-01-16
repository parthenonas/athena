import { SortOrder } from "./common";

/**
 * Payload for creating a new Cohort.
 */
export interface CreateCohortRequest {
  name: string;
  instructorId: string;
  courseId: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

/**
 * Payload for updating a Cohort.
 */
export interface UpdateCohortRequest {
  name?: string;
  instructorId?: string;
  courseId?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

/**
 * Response shape for a Cohort entity.
 */
export interface CohortResponse {
  id: string;
  name: string;
  instructorId: string;
  courseId: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query parameters for filtering Cohorts.
 */
export interface FilterCohortRequest {
  search?: string;
  instructorId?: string;
  courseId?: string;
  page: number;
  limit: number;
  sortBy: "name" | "startDate" | "createdAt";
  sortOrder: SortOrder;
}
