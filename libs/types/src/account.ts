import { Permission, Policy } from "./acl";
import { SortOrder } from "./common";

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

export interface CreateAccountRequest {
  login: string;
  password: string;
  roleId?: string;
}

export interface FilterAccountRequest {
  search?: string;
  page: number;
  limit: number;
  sortBy: "login" | "status" | "createdAt" | "updatedAt";
  sortOrder: SortOrder;
}

export interface AccountResponse {
  id: string;
  login: string;
  status: Status;
  roleId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenResponse {
  accessToken: string;
}

export type UpdateAccountRequest = Partial<CreateAccountRequest>;
