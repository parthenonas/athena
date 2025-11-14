import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { PERMISSION_KEY } from "./decorators/require-permission.decorator";
import { POLICIES_KEY } from "./decorators/require-policies.decorator";

@Injectable()
export class AclGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, ctx.getHandler());

    const requiredPolicies = this.reflector.get<string[]>(POLICIES_KEY, ctx.getHandler()) || [];

    if (!requiredPermission) return true;

    if (!user.role.permissions.includes(requiredPermission)) {
      throw new ForbiddenException("Missing permission");
    }

    const appliedPolicies = user.role.policies[requiredPermission] || [];

    for (const policy of requiredPolicies) {
      if (!appliedPolicies.includes(policy)) {
        throw new ForbiddenException(`Missing policy: ${policy}`);
      }
    }

    req.appliedPolicies = appliedPolicies;
    return true;
  }
}
