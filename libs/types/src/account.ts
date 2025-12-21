import { Permission, Policy } from "./acl";

export enum Status {
  Active = "active",
  Blocked = "blocked",
  TemporaryBlocked = "temporary_blocked",
}

export interface RefreshTokenPayload {
  sub: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface AccessTokenPayload extends RefreshTokenPayload {
  role: string;
  permissions: Permission[];
  policies: Partial<Record<Permission, Policy[]>>;
}

export interface LoginRequest {
  login: string;
  password: string;
}
