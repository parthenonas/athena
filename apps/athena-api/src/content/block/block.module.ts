import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BlockController } from "./block.controller";
import { BlockService } from "./block.service";
import { IdentityModule } from "../../identity";
import { Block } from "./entities/block.entity";
import { Lesson } from "../lesson/entities/lesson.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Block, Lesson]), IdentityModule, JwtModule],
  providers: [BlockService],
  controllers: [BlockController],
  exports: [BlockService],
})
export class BlockModule {}
