import { Module } from "@nestjs/common";

import { AccountModule } from "./account/account.module";
import { AclModule } from "./acl/acl.module";
import { IdentityService } from "./identity.service";
import { ProfileRecordModule } from "./profile-record/profile-record.module";

@Module({
  imports: [AccountModule, AclModule, ProfileRecordModule],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
