import { Permission, Policy } from "./acl";

export enum Status {
  Active = "active",
  Blocked = "blocked",
  TemporaryBlocked = "temporary_blocked",
}

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string;
  permissions: Permission[];
  policies: Partial<Record<Permission, Policy[]>>;
  iat?: number;
  exp?: number;
}
