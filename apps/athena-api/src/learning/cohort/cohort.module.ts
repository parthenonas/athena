import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Cohort } from "./entities/cohort.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Cohort])],
  providers: [],
  exports: [],
})
export class CohortModule {}
