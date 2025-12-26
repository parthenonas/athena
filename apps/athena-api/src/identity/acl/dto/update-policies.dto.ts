import { Permission, Policy, UpdateRolePoliciesRequest } from "@athena/types";
import { IsObject } from "class-validator";

export class UpdateRolePoliciesDto implements UpdateRolePoliciesRequest {
  @IsObject()
  policies!: Partial<Record<Permission, Policy[]>>;
}
