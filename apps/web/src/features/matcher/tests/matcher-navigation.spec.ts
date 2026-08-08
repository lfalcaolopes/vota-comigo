import { describe, expect, it } from "vitest";

import { getMatcherNavigationMethod } from "../lib/matcher-navigation";

describe("matcher navigation", () => {
  describe("when changing resultado filters", () => {
    it("replaces the current history entry", () => {
      // Arrange / Act
      const method = getMatcherNavigationMethod("filter");

      // Assert
      expect(method).toBe("replace");
    });
  });

  describe("when moving between proposition positions", () => {
    it("replaces the current history entry", () => {
      // Arrange / Act
      const method = getMatcherNavigationMethod("position");

      // Assert
      expect(method).toBe("replace");
    });
  });

  describe("when moving between matcher steps", () => {
    it("adds a history entry", () => {
      // Arrange / Act
      const method = getMatcherNavigationMethod("step");

      // Assert
      expect(method).toBe("push");
    });
  });
});
