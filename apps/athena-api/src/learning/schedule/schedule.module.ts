import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Schedule } from "./entities/schedule.entity";
import { ScheduleService } from "./schedule.service";
import { IdentityModule } from "../../identity";

@Module({
  imports: [TypeOrmModule.forFeature([Schedule]), IdentityModule],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
