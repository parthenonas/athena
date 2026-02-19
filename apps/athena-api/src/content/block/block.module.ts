import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BlockController } from "./block.controller";
import { BlockService } from "./block.service";
import { IdentityModule } from "../../identity";
import { OutboxModule } from "../../outbox";
import { SubmissionQueueModule } from "../../submission-queue";
import { Block } from "./entities/block.entity";
import { Lesson } from "../lesson/entities/lesson.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Block, Lesson]), IdentityModule, JwtModule, SubmissionQueueModule, OutboxModule],
  providers: [BlockService],
  controllers: [BlockController],
  exports: [BlockService],
})
export class BlockModule {}
