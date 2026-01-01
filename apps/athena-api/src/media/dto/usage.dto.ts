import { StorageUsageResponse } from "@athena/types";
import { Expose } from "class-transformer";

export class StorageUsageDto implements StorageUsageResponse {
  @Expose()
  usedBytes!: number;

  @Expose()
  limitBytes!: number;

  @Expose()
  percentage!: number;
}
