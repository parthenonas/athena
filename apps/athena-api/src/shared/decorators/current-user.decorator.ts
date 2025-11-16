import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator((key: string, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();

  return key ? req.user?.[key] : req.user;
});
