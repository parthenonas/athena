import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class SetQuotaDto {
  /**
   * The role name (e.g., "student", "teacher").
   * Must match the role name in the Identity module.
   */
  @IsString()
  @IsNotEmpty()
  roleName!: string;

  /**
   * Storage limit in bytes.
   * Example: 104857600 (100 MB)
   */
  @IsInt()
  @Min(0)
  limitBytes!: number;
}
