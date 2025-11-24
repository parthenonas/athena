import { SetMetadata } from "@nestjs/common";

export const POLICIES_KEY = "requirePolicy";

export const RequirePolicy = (...policies: string[]) => SetMetadata(POLICIES_KEY, policies);
