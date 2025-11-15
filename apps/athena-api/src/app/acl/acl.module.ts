import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AbilityService } from "./ability.service";
import { Role } from "./entities/role.entity";
import { RoleService } from "./role.service";

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  providers: [AbilityService, RoleService],
  exports: [RoleService, AbilityService],
})
export class AclModule {}
