import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OutboxMessage } from "./entities/outbox-message.entity";
import { OutboxProcessor } from "./outbox.processor";
import { OutboxService } from "./outbox.service";

@Module({
  imports: [TypeOrmModule.forFeature([OutboxMessage]), ScheduleModule.forRoot()],
  providers: [OutboxService, OutboxProcessor],
  exports: [OutboxService],
})
export class OutboxModule {}
