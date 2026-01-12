import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CohortController } from "./cohort.controller";
import { CohortService } from "./cohort.service";
import { IdentityModule } from "../../identity";
import { Cohort } from "./entities/cohort.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Cohort]), IdentityModule],
  providers: [CohortService],
  exports: [CohortService],
  controllers: [CohortController],
})
export class CohortModule {}
