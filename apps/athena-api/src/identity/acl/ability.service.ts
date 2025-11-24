import { Ownable, Policy, Publishable } from "@athena/types";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AbilityService {
  check(policy: Policy, user: { id: string }, resource: unknown) {
    switch (policy) {
      case Policy.OWN_ONLY:
        return (resource as Ownable).ownerId === user.id;

      case Policy.NOT_PUBLISHED:
        return (resource as Publishable).published;

      default:
        return true;
    }
  }
}
