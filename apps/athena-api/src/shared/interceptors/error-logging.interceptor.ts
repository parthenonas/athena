import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, catchError, throwError } from "rxjs";

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;

    return next.handle().pipe(
      catchError(err => {
        const message = err instanceof Error ? err.message : String(err);

        this.logger.error(`${method} ${url} → ${message}`);

        if (err instanceof HttpException) {
          return throwError(() => err);
        }

        return throwError(() => new BadRequestException("Request error"));
      }),
    );
  }
}
