import { Ownable, Policy, Publishable } from "@athena/types";
import { Test } from "@nestjs/testing";

import { AbilityService } from "./ability.service";

describe("AbilityService", () => {
  let service: AbilityService;

  const USER_ID = "u1";
  const OTHER_USER_ID = "u2";

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AbilityService],
    }).compile();

    service = moduleRef.get<AbilityService>(AbilityService);
  });

  describe("OWN_ONLY policy check (check method)", () => {
    it("should return true when user owns resource", () => {
      const resource: Ownable = { ownerId: USER_ID };

      const result = service.check(Policy.OWN_ONLY, USER_ID, resource);

      expect(result).toBe(true);
    });

    it("should return false when user does not own resource", () => {
      const resource: Ownable = { ownerId: OTHER_USER_ID };

      const result = service.check(Policy.OWN_ONLY, USER_ID, resource);

      expect(result).toBe(false);
    });
  });

  describe("NOT_PUBLISHED policy check (check method)", () => {
    it("should return true when resource is NOT published (isPublished: false)", () => {
      const resource: Publishable = { isPublished: false };

      const result = service.check(Policy.NOT_PUBLISHED, USER_ID, resource);

      expect(result).toBe(true);
    });

    it("should return false when resource IS published (isPublished: true)", () => {
      const resource: Publishable = { isPublished: true };

      const result = service.check(Policy.NOT_PUBLISHED, USER_ID, resource);

      expect(result).toBe(false);
    });
  });

  describe("ONLY_PUBLISHED policy check (check method)", () => {
    it("should return true when resource IS published", () => {
      const resource: Publishable = { isPublished: true };

      const result = service.check(Policy.ONLY_PUBLISHED, USER_ID, resource);

      expect(result).toBe(true);
    });

    it("should return false when resource is NOT published", () => {
      const resource: Publishable = { isPublished: false };

      const result = service.check(Policy.ONLY_PUBLISHED, USER_ID, resource);

      expect(result).toBe(false);
    });
  });

  describe("PUBLISHED_OR_OWNER policy check (check method)", () => {
    it("should return true when resource is published (even if not owner)", () => {
      const resource = { isPublished: true, ownerId: OTHER_USER_ID };

      const result = service.check(Policy.PUBLISHED_OR_OWNER, USER_ID, resource);

      expect(result).toBe(true);
    });

    it("should return true when user is owner (even if not published)", () => {
      const resource = { isPublished: false, ownerId: USER_ID };

      const result = service.check(Policy.PUBLISHED_OR_OWNER, USER_ID, resource);

      expect(result).toBe(true);
    });

    it("should return true when user is owner AND resource is published", () => {
      const resource = { isPublished: true, ownerId: USER_ID };

      const result = service.check(Policy.PUBLISHED_OR_OWNER, USER_ID, resource);

      expect(result).toBe(true);
    });

    it("should return false when resource is NOT published AND user is NOT owner", () => {
      const resource = { isPublished: false, ownerId: OTHER_USER_ID };

      const result = service.check(Policy.PUBLISHED_OR_OWNER, USER_ID, resource);

      expect(result).toBe(false);
    });
  });

  describe("default policy", () => {
    it("should return true for any unhandled policy", () => {
      const result = service.check("UNKNOWN_POLICY" as Policy, USER_ID, {});
      expect(result).toBe(true);
    });
  });
});
