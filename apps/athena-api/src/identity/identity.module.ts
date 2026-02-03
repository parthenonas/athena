import { Module } from "@nestjs/common";

import { AccountModule } from "./account/account.module";
import { AclModule } from "./acl/acl.module";
import { IdentityService } from "./identity.service";
import { ProfileModule } from "./profile";

@Module({
  imports: [AccountModule, AclModule, ProfileModule],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
