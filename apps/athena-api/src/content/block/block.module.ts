import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BlockService } from "./block.service";
import { IdentityModule } from "../../identity";
import { Block } from "./entities/block.entity";
import { Lesson } from "../lesson/entities/lesson.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Block, Lesson]), IdentityModule],
  providers: [BlockService],
  exports: [BlockService],
})
export class BlockModule {}
