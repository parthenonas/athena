import { SetMetadata } from "@nestjs/common";

export const PERMISSION_KEY = "requirePermission";

export const RequirePermission = (perm: string) => SetMetadata(PERMISSION_KEY, perm);
