import { Module } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Profile } from "./entities/profile.entity";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { AclModule } from "../acl/acl.module";

@Module({
  imports: [TypeOrmModule.forFeature([Profile]), AclModule, JwtModule],
  controllers: [ProfileController],
  providers: [ProfileService, JwtService],
  exports: [ProfileService],
})
export class ProfileModule {}
