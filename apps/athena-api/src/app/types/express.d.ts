import { Permission, Policy } from "@athena-lms/shared";

declare module "express-serve-static-core" {
  interface Request {
    user: {
      id: string;
      login: string;
      role: string;
      permissions: Permission[];
      policies: Record<Permission, Policy[]>;
      iat?: number;
      exp?: number;
    };

    appliedPolicies?: Policy[];
  }
}

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string;
  permissions: Permission[];
  policies: Record<Permission, Policy[]>;
  iat?: number;
  exp?: number;
}
