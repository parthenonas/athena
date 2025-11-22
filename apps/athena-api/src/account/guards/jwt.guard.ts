import { AccessTokenPayload } from "@athena/types";
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn("Missing Authorization header");
      throw new UnauthorizedException("Missing token");
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer") {
      throw new UnauthorizedException("Invalid authorization scheme");
    }

    if (!token) {
      throw new UnauthorizedException("Invalid token format");
    }

    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token);
      request.user = payload;
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Token verification failed: ${message}`);
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
