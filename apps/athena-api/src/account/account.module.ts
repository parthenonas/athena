import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";
import { Account } from "./entities/account.entity";
import { Role } from "../acl/entities/role.entity";
import { ProfileRecord } from "../profile-record/entities/profile-record.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Account, Role, ProfileRecord]), JwtModule, ConfigModule],
  providers: [AccountService],
  exports: [AccountService],
  controllers: [AccountController],
})
export class AccountModule {}
