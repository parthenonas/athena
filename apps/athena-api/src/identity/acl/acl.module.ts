import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AbilityService } from "./ability.service";
import { Role } from "./entities/role.entity";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";

@Module({
  imports: [TypeOrmModule.forFeature([Role]), JwtModule],
  providers: [AbilityService, RoleService],
  exports: [RoleService, AbilityService],
  controllers: [RoleController],
})
export class AclModule {}
