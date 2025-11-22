import { AccessTokenPayload, Policy } from "libs/types/src";

declare global {
  namespace Express {
    interface Request {
      user: AccessTokenPayload;
      appliedPolicies?: Policy[];
    }
  }
}
