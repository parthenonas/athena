import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";
import { Account } from "./entities/account.entity";
import { Role } from "../acl/entities/role.entity";
import { Profile } from "../profile/entities/profile.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Account, Role, Profile]), JwtModule, ConfigModule],
  providers: [AccountService],
  exports: [AccountService, JwtModule],
  controllers: [AccountController],
})
export class AccountModule {}
