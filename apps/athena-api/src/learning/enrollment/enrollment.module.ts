import { Module } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { EnrollmentController } from "./enrollment.controller";
import { EnrollmentService } from "./enrollment.service";
import { IdentityModule } from "../../identity";
import { OutboxModule } from "../../outbox";
import { Enrollment } from "./entities/enrollment.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment]), IdentityModule, JwtModule, OutboxModule],
  providers: [EnrollmentService, JwtService],
  exports: [EnrollmentService],
  controllers: [EnrollmentController],
})
export class EnrollmentModule {}
