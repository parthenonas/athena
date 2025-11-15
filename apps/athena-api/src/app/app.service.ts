import { Permission } from "@athena-lms/shared";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import { AccountService } from "./account/account.service";
import { RoleService } from "./acl";

@Injectable()
/**
 * @class AppService
 * @description
 * Performs system bootstrap during application startup.
 *
 * ## Responsibilities:
 * - Ensure the `admin` role exists
 * - Ensure a default `admin` account exists
 * - Maintain a valid initial access structure for the platform
 *
 * This initializer is idempotent — it never creates duplicates.
 */
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly accountService: AccountService,
    private readonly roleService: RoleService,
  ) {}

  /**
   * @method onModuleInit
   * @description
   * Executed once the NestJS module has been initialized.
   *
   * Steps:
   * 1. Create `admin` role if missing
   * 2. Create `admin` account if missing
   */
  async onModuleInit() {
    this.logger.log("Application bootstrap started");

    try {
      this.logger.log("Checking for existing admin role");

      let adminRole = await this.roleService.findByName("admin");

      if (!adminRole) {
        this.logger.warn("Admin role not found — creating new role");

        adminRole = await this.roleService.create({
          name: "admin",
          permissions: [Permission.ADMIN],
          policies: {},
        });

        this.logger.log(`Admin role created | id=${adminRole.id}`);
      } else {
        this.logger.log(`Admin role already exists | id=${adminRole.id}`);
      }

      this.logger.log('Checking for "admin" account');

      let admin = await this.accountService.findOneByLogin("admin").catch(() => null);

      if (!admin) {
        this.logger.warn("Admin account not found — creating default admin account");

        admin = await this.accountService.create({
          login: "admin",
          password: "admin",
          roleId: adminRole.id,
        });

        this.logger.log(`Admin account created | id=${admin.id}`);
      } else {
        this.logger.log(`Admin account already exists | id=${admin.id}`);
      }

      this.logger.log("Application bootstrap completed successfully");
    } catch (error: unknown) {
      const err = error as Error;

      this.logger.error(`Bootstrap failed: ${err.message}`, err.stack);

      throw error;
    }
  }
}
