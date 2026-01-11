import { BlockRequiredAction } from "./block";

/**
 * Interface defining the structure of the config_overrides JSONB column.
 * Maps block IDs to required actions.
 */
export interface ScheduleConfigOverrides {
  [blockId: string]: BlockRequiredAction;
}
