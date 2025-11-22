import { Permission } from "@athena/types";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { PERMISSION_KEY } from "../acl/decorators/require-permission.decorator";
import { POLICIES_KEY } from "../acl/decorators/require-policy.decorator";

@Injectable()
export class AclGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user;

    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, ctx.getHandler());

    const requiredPolicies = this.reflector.get<string[]>(POLICIES_KEY, ctx.getHandler()) || [];

    if (!requiredPermission) return true;

    if (!user.permissions.includes(requiredPermission as Permission)) {
      throw new ForbiddenException("Missing permission");
    }

    const appliedPolicies = user.policies[requiredPermission] || [];

    for (const policy of requiredPolicies) {
      if (!appliedPolicies.includes(policy)) {
        throw new ForbiddenException(`Missing policy: ${policy}`);
      }
    }

    req.appliedPolicies = appliedPolicies;
    return true;
  }
}
