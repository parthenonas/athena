import { BlockRequiredAction } from "./block";
import { SortOrder } from "./common";

/**
 * Interface defining the structure of the config_overrides JSONB column.
 * Maps block IDs to required actions.
 */
export interface ScheduleConfigOverrides {
  [blockId: string]: BlockRequiredAction;
}

/**
 * Payload for creating a schedule entry (Lesson <-> Cohort).
 */
export interface CreateScheduleRequest {
  cohortId: string;
  lessonId: string;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  isOpenManually?: boolean;
  configOverrides?: ScheduleConfigOverrides;
}

/**
 * Payload for updating schedule details.
 */
export interface UpdateScheduleRequest {
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  isOpenManually?: boolean;
  configOverrides?: ScheduleConfigOverrides;
}

/**
 * Response shape for a Schedule entity.
 */
export interface ScheduleResponse {
  id: string;
  cohortId: string;
  lessonId: string;
  startAt: Date | null;
  endAt: Date | null;
  isOpenManually: boolean;
  configOverrides: ScheduleConfigOverrides;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query parameters for filtering schedules.
 */
export interface FilterScheduleRequest {
  cohortId?: string;
  lessonId?: string;
  page: number;
  limit: number;
  sortBy: "startAt" | "createdAt";
  sortOrder: SortOrder;
}
