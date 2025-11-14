import { SetMetadata } from "@nestjs/common";

export const POLICIES_KEY = "requirePolicies";

export const RequirePolicies = (...policies: string[]) => SetMetadata(POLICIES_KEY, policies);
