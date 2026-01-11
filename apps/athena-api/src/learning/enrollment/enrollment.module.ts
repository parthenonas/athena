import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { EnrollmentService } from "./enrollment.service";
import { IdentityModule } from "../../identity";
import { Enrollment } from "./entities/enrollment.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment]), IdentityModule],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
