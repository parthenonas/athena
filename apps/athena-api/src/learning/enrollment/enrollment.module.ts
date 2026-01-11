import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Enrollment } from "./entities/enrollment.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment])],
  providers: [],
  exports: [],
})
export class EnrollmentModule {}
