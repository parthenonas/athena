import { Permission } from "@athena-lms/shared/types/acl";
import { Injectable, Logger } from "@nestjs/common";
import { Command, Option, Positional } from "nestjs-command";

import { AccountService } from "../account/account.service";
import { RoleService } from "../acl";

@Injectable()
export class AccountCommand {
  private readonly logger = new Logger(AccountCommand.name);

  constructor(
    private readonly accountService: AccountService,
    private readonly roleService: RoleService,
  ) {}

  @Command({
    command: "create:admin <login>",
    describe: "Create a superadmin account",
  })
  async createAdmin(
    @Positional({
      name: "login",
      type: "string",
      describe: "Login for the admin account",
    })
    login: string,

    @Option({
      name: "password",
      alias: "p",
      type: "string",
      demandOption: true,
      describe: "Admin password",
    })
    password: string,
  ) {
    try {
      let role = await this.roleService.findByName("admin");
      if (!role) {
        this.logger.log("Admin role does not exist, creating...");
        role = await this.roleService.create({
          name: "admin",
          permissions: [Permission.ADMIN],
          policies: {},
        });
      }

      const exists = await this.accountService.findOneByLogin(login);
      if (exists) {
        this.logger.warn(`Account "${login}" already exists`);
        return;
      }

      await this.accountService.create({
        login,
        password,
        roleId: role.id,
      });

      this.logger.log(`Admin account "${login}" created successfully`);
    } catch (error) {
      this.logger.error("Failed to create admin:", error);
    }
  }
}
