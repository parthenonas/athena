import { AccessTokenPayload, Policy } from "@athena/types";

declare global {
  namespace Express {
    interface Request {
      user: AccessTokenPayload;
      appliedPolicies?: Policy[];
    }
  }
}
