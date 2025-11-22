import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { ErrorLoggingInterceptor } from "./shared/interceptors/error-logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = "api";

  app.setGlobalPrefix(globalPrefix);
  app.useGlobalInterceptors(new ErrorLoggingInterceptor());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 3000;
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:4200",
    credentials: true,
  });
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
