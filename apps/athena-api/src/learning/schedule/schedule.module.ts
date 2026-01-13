import { Module } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Schedule } from "./entities/schedule.entity";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
import { IdentityModule } from "../../identity";

@Module({
  imports: [TypeOrmModule.forFeature([Schedule]), IdentityModule, JwtModule],
  providers: [ScheduleService, JwtService],
  exports: [ScheduleService],
  controllers: [ScheduleController],
})
export class ScheduleModule {}
