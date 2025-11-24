import { Permission, Policy } from "@athena/types";
import { IsObject } from "class-validator";

export class UpdateRolePoliciesDto {
  @IsObject()
  policies!: Partial<Record<Permission, Policy[]>>;
}
