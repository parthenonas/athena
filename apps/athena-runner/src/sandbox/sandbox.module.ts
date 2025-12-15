import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { SandboxService } from "./sandbox.service";
import { ProcessExecutor } from "./utils/process.executor";

@Module({
  imports: [ConfigModule],
  providers: [SandboxService, ProcessExecutor],
  exports: [SandboxService],
})
export class SandboxModule {}
