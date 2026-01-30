import { GradingStatus } from "@athena/types";

import { BlockResult } from "./block-result.vo";

describe("BlockResult Value Object", () => {
  const DATE = new Date("2026-01-01T12:00:00Z");

  it("should create a valid instance", () => {
    const result = new BlockResult(100, DATE);
    expect(result.score).toBe(100);
    expect(result.status).toBe(GradingStatus.GRADED);
  });

  it("should throw error on negative score", () => {
    expect(() => new BlockResult(-10, DATE)).toThrow("Score cannot be negative");
  });

  describe("equals", () => {
    it("should return true for identical objects", () => {
      const a = new BlockResult(100, DATE, GradingStatus.GRADED, { code: "123" });
      const b = new BlockResult(100, DATE, GradingStatus.GRADED, { code: "123" });

      expect(a.equals(b)).toBe(true);
    });

    it("should return false for different scores", () => {
      const a = new BlockResult(100, DATE);
      const b = new BlockResult(90, DATE);

      expect(a.equals(b)).toBe(false);
    });

    it("should return false for different dates", () => {
      const a = new BlockResult(100, DATE);
      const b = new BlockResult(100, new Date("2027-01-01"));

      expect(a.equals(b)).toBe(false);
    });

    it("should handle date string vs Date object comparison", () => {
      const dateStr = DATE.toISOString();
      const a = new BlockResult(100, DATE);
      const b = new BlockResult(100, dateStr as any);

      expect(a.equals(b)).toBe(true);
    });
  });
});
