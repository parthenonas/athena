import { Ownable, Policy, Publishable } from "@athena/types";
import { Injectable } from "@nestjs/common";
import { Brackets, ObjectLiteral, SelectQueryBuilder } from "typeorm";

@Injectable()
export class AbilityService {
  /**
   * @method check
   * Checks if a single resource satisfies a specific object-level policy.
   *
   * @param policy - The policy rule to check (e.g., OWN_ONLY, NOT_PUBLISHED).
   * @param user - Object containing the ID of the authenticated user.
   * @param resource - The resource entity (must implement Ownable or Publishable).
   * @returns boolean - True if the policy is satisfied, false otherwise.
   *
   * @example
   * this.abilityService.check(Policy.OWN_ONLY, user, course);
   */
  check(policy: Policy, userId: string, resource: unknown): boolean {
    switch (policy) {
      case Policy.OWN_ONLY:
        return (resource as Ownable).ownerId === userId;

      case Policy.NOT_PUBLISHED:
        return (resource as Publishable).isPublished === false;

      case Policy.ONLY_PUBLISHED:
        return (resource as Publishable).isPublished === true;

      case Policy.PUBLISHED_OR_OWNER:
        return (resource as Publishable).isPublished === true || (resource as Ownable).ownerId === userId;

      default:
        return true;
    }
  }

  /**
   * @method applyPoliciesToQuery
   * Dynamically modifies a TypeORM QueryBuilder by applying filtering conditions
   * based on the list of policies assigned to the user's role.
   *
   * This ensures that lists and collections fetched from the database comply with
   * object-level security constraints (e.g., a teacher only sees their own courses).
   *
   * @param qb - The TypeORM SelectQueryBuilder instance. Assumed to use alias 'c'.
   * @param userId - ID of the currently authenticated user (used for OWN_ONLY checks).
   * @param appliedPolicies - Array of policy enums required for the current route.
   * @param targetAlias - The alias of the entity/table that holds the 'ownerId' and 'isPublished' columns.
   *
   * @example
   * const qb = this.repo.createQueryBuilder('c');
   * this.abilityService.applyPoliciesToQuery(qb, userId, policies, 'c');
   */
  applyPoliciesToQuery<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    userId: string,
    appliedPolicies: Policy[],
    targetAlias: string,
  ): void {
    if (!appliedPolicies || appliedPolicies.length === 0) {
      return;
    }

    for (const policy of appliedPolicies) {
      switch (policy) {
        case Policy.OWN_ONLY:
          // Теперь мы используем динамический алиас!
          qb.andWhere(`${targetAlias}.ownerId = :policyUserId`, { policyUserId: userId });
          break;

        case Policy.NOT_PUBLISHED:
          qb.andWhere(`${targetAlias}.isPublished = :isPublishedFalse`, { isPublishedFalse: false });
          break;

        case Policy.ONLY_PUBLISHED:
          qb.andWhere(`${targetAlias}.isPublished = :isPublishedTrue`, { isPublishedTrue: true });
          break;

        case Policy.PUBLISHED_OR_OWNER:
          qb.andWhere(
            new Brackets(subQb => {
              subQb
                .where(`${targetAlias}.isPublished = :isPublishedTrue`, { isPublishedTrue: true })
                .orWhere(`${targetAlias}.ownerId = :policyUserId`, { policyUserId: userId });
            }),
          );
          break;
      }
    }
  }
}
