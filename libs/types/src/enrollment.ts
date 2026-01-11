import { SortOrder } from "./common";

export enum EnrollmentStatus {
  Active = "active",
  Completed = "completed",
  Expelled = "expelled",
}

/**
 * Payload for enrolling a student into a cohort.
 */
export interface CreateEnrollmentRequest {
  cohortId: string;
  ownerId: string;
  status?: EnrollmentStatus;
}

/**
 * Payload for updating enrollment status (e.g. expelling or graduating).
 */
export interface UpdateEnrollmentRequest {
  status?: EnrollmentStatus;
}

/**
 * Response shape for an Enrollment entity.
 */
export interface EnrollmentResponse {
  id: string;
  cohortId: string;
  ownerId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
}

/**
 * Query parameters for filtering enrollments.
 */
export interface FilterEnrollmentRequest {
  cohortId?: string;
  ownerId?: string;
  status?: EnrollmentStatus;
  page: number;
  limit: number;
  sortBy: "enrolledAt" | "status";
  sortOrder: SortOrder;
}
