import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { IdentityModule } from "../identity";
import { MediaQuota } from "./entities/media-quota.entity";
import { StoredFile } from "./entities/stored-file.entity";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([StoredFile, MediaQuota]), IdentityModule, JwtModule],
  providers: [MediaService],
  exports: [MediaService],
  controllers: [MediaController],
})
export class MediaModule {}
