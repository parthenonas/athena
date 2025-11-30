import { Policy } from "@athena/types";
import { Injectable } from "@nestjs/common";
import { ObjectLiteral, SelectQueryBuilder } from "typeorm";

import { AccountService } from "./account/account.service";
import { CreateAccountDto } from "./account/dto/create.dto";
import { AbilityService } from "./acl/ability.service";
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
    private readonly abilityService: AbilityService,
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
   * @param login - A unique username.
   * @returns Account entity or `null` if not found.
   *
   * Delegates to {@link AccountService.findOneByLogin}.
   */
  async findAccountByLogin(login: string) {
    return this.accountService.findOneByLogin(login);
  }

  /**
   * Retrieves an account using its identifier.
   *
   * @param id - A unique id.
   * @returns Account entity or `null` if not found.
   *
   * Delegates to {@link AccountService.findOneByLogin}.
   */
  async findAccountById(id: string) {
    return this.accountService.findOne(id);
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

  /**
   * @method checkAbility
   * Checks if a single resource satisfies a specific object-level policy.
   *
   * @param policy - The policy rule to check (e.g., OWN_ONLY, NOT_PUBLISHED).
   * @param userId - ID of the authenticated user.
   * @param resource - The resource entity being checked.
   * @returns boolean - True if the policy is satisfied, false otherwise.
   *
   * Delegates to {@link AbilityService.check}.
   */
  checkAbility(policy: Policy, userId: string, resource: unknown): boolean {
    return this.abilityService.check(policy, userId, resource);
  }

  /**
   * @method applyPoliciesToQuery
   * Dynamically modifies a TypeORM QueryBuilder by applying filtering conditions
   * based on the list of policies assigned to the user's role.
   *
   * This method is used by other Bounded Contexts (e.g., ContentModule) to ensure
   * resource lists comply with security constraints (e.g., OWN_ONLY).
   *
   * @param qb - The TypeORM SelectQueryBuilder instance.
   * @param userId - ID of the currently authenticated user.
   * @param appliedPolicies - Array of policy enums required for the current route.
   * @returns SelectQueryBuilder<T> - The modified QueryBuilder instance.
   *
   * Delegates to {@link AbilityService.applyPoliciesToQuery}.
   */
  applyPoliciesToQuery<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    userId: string,
    appliedPolicies: Policy[],
  ): void {
    this.abilityService.applyPoliciesToQuery(qb, userId, appliedPolicies);
  }
}
