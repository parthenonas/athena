import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { EnrollmentService } from "./enrollment.service";
import { IdentityModule } from "../../identity";
import { Enrollment } from "./entities/enrollment.entity";
import { CohortController } from "../cohort/cohort.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment]), IdentityModule],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
  controllers: [CohortController],
})
export class EnrollmentModule {}
