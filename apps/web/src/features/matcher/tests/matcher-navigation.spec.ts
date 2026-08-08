import { describe, expect, it } from "vitest";

import { getMatcherNavigationMethod } from "../lib/matcher-navigation";

describe("matcher navigation", () => {
  describe("when moving between matcher steps", () => {
    it("adds a history entry", () => {
      // Arrange / Act
      const method = getMatcherNavigationMethod("step");

      // Assert
      expect(method).toBe("push");
    });
  });
});
