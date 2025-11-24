import { Injectable } from "@nestjs/common";

import { AccountService } from "./account/account.service";
import { CreateAccountDto } from "./account/dto/create.dto";
import { CreateRoleDto } from "./acl/dto/create.dto";
import { RoleService } from "./acl/role.service";

/**
 * The **IdentityService** acts as a *facade* over the entire Identity
 * bounded context. Its purpose is to provide a unified, simplified API
 * for other modules (e.g. Learning, Courses, Admin UI) without exposing
 * internal services such as `AccountService`, `RoleService`, or
 * `ProfileRecordsService`.
 *
 * ## Responsibilities
 * - High-level account lookup and creation.
 * - High-level role lookup and creation.
 * - Delegation of actions to underlying services.
 *
 * ## Non-Responsibilities
 * - Does **not** contain any business logic.
 * - Does **not** perform validation or authorization.
 * - Does **not** perform any domain-specific decisions.
 *
 * This class is intentionally thin — its only purpose is *delegation*
 * and boundary management.
 */
@Injectable()
export class IdentityService {
  constructor(
    private readonly accountService: AccountService,
    private readonly roleService: RoleService,
  ) {}

  /**
   * Finds a role by its unique name.
   *
   * @param name - Name of the role (e.g. `"admin"`, `"teacher"`)
   * @returns Role entity or `null` if not found.
   *
   * Delegates to {@link RoleService.findByName}.
   */
  async findRoleByName(name: string) {
    return this.roleService.findByName(name);
  }

  /**
   * Creates a new role in the system.
   *
   * @param dto - Data required to create a new role.
   * @returns The created role entity.
   *
   * Delegates to {@link RoleService.create}.
   */
  async createRole(dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  /**
   * Retrieves an account using its login identifier.
   *
   * @param login - A unique login or username.
   * @returns Account entity or `null` if not found.
   *
   * Delegates to {@link AccountService.findOneByLogin}.
   */
  async findAccountByLogin(login: string) {
    return this.accountService.findOneByLogin(login);
  }

  /**
   * Creates a new account.
   *
   * @param dto - Data required to create an account.
   * @returns The created account entity.
   *
   * Delegates to {@link AccountService.create}.
   */
  async createAccount(dto: CreateAccountDto) {
    return this.accountService.create(dto);
  }
}
