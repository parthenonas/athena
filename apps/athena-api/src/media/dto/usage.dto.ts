import { Expose } from "class-transformer";

export class StorageUsageDto {
  @Expose()
  usedBytes!: number;

  @Expose()
  limitBytes!: number;

  @Expose()
  percentage!: number;
}
