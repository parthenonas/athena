import { Policy } from "@athena-lms/shared";
import { Test } from "@nestjs/testing";

import { AbilityService } from "./ability.service";

describe("AbilityService", () => {
  let service: AbilityService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AbilityService],
    }).compile();

    service = moduleRef.get<AbilityService>(AbilityService);
  });

  describe("OWN_ONLY", () => {
    it("should return true when user owns resource", () => {
      const user = { id: "u1" };
      const resource = { ownerId: "u1" };

      const result = service.check(Policy.OWN_ONLY, user, resource);

      expect(result).toBe(true);
    });

    it("should return false when user does not own resource", () => {
      const user = { id: "u1" };
      const resource = { ownerId: "u2" };

      const result = service.check(Policy.OWN_ONLY, user, resource);

      expect(result).toBe(false);
    });
  });

  describe("NOT_PUBLISHED", () => {
    it("should return true when resource.published is true", () => {
      const user = { id: "u1" };
      const resource = { published: true };

      const result = service.check(Policy.NOT_PUBLISHED, user, resource);

      expect(result).toBe(true);
    });

    it("should return false when resource.published is false", () => {
      const user = { id: "u1" };
      const resource = { published: false };

      const result = service.check(Policy.NOT_PUBLISHED, user, resource);

      expect(result).toBe(false);
    });
  });

  describe("default policy", () => {
    it("should return true for any unhandled policy", () => {
      const result = service.check("UNKNOWN_POLICY" as any, { id: "u1" }, {});
      expect(result).toBe(true);
    });
  });
});
