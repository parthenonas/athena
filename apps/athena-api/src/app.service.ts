import { Permission } from "@athena/types";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { IdentityService } from "./identity";

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

  private readonly initialAdminUsername: string;
  private readonly initialAdminPassword: string;
  private readonly initialAdminRoleName: string;

  constructor(
    private readonly identityService: IdentityService,
    private readonly configService: ConfigService,
  ) {
    this.initialAdminUsername = this.configService.get<string>("INITIAL_ADMIN_USERNAME") || "admin";
    this.initialAdminPassword = this.configService.get<string>("INITIAL_ADMIN_PASSWORD") || "admin";
    this.initialAdminRoleName = this.configService.get<string>("INITIAL_ADMIN_ROLE_NAME") || "admin";
  }

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
      this.logger.log(`Checking for existing admin role '${this.initialAdminRoleName}'`);

      let adminRole = await this.identityService.findRoleByName(this.initialAdminRoleName);

      if (!adminRole) {
        this.logger.warn(`Admin role '${this.initialAdminRoleName}' not found — creating new role`);

        adminRole = await this.identityService.createRole({
          name: this.initialAdminRoleName,
          permissions: [Permission.ADMIN],
          policies: {},
        });

        this.logger.log(`Admin role '${this.initialAdminRoleName}' created | id=${adminRole.id}`);
      } else {
        this.logger.log(`Admin role '${this.initialAdminRoleName}' already exists | id=${adminRole.id}`);
      }

      this.logger.log(`Checking for '${this.initialAdminUsername}' account`);

      let admin = await this.identityService.findAccountByLogin(this.initialAdminUsername).catch(() => null);

      if (!admin) {
        this.logger.warn(`Admin account '${this.initialAdminUsername}' not found — creating default admin account`);

        admin = await this.identityService.createAccount({
          login: this.initialAdminUsername,
          password: this.initialAdminPassword,
          roleId: adminRole.id,
        });

        this.logger.log(`Admin account '${this.initialAdminUsername}' created | id=${admin.id}`);
      } else {
        this.logger.log(`Admin account '${this.initialAdminUsername}' already exists | id=${admin.id}`);
      }

      this.logger.log("Application bootstrap completed successfully");
    } catch (error: unknown) {
      const err = error as Error;

      this.logger.error(`Bootstrap failed: ${err.message}`, err.stack);

      throw error;
    }
  }
}
