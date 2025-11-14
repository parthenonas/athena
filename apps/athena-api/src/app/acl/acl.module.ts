import { Module } from "@nestjs/common";
import { AbilityService } from "./ability.service";

@Module({
  providers: [AbilityService],
})
export class AclModule {}
