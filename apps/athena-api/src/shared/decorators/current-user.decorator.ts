import { AccessTokenPayload } from "@athena/types";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export const CurrentUser = createParamDecorator((key: keyof AccessTokenPayload, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request>();

  return key ? req.user?.[key] : req.user;
});
