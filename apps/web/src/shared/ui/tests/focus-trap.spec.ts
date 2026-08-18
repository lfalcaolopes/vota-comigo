import { describe, expect, it } from "vitest";

import { nextFocusIndex } from "../focus-trap";

describe("nextFocusIndex", () => {
  describe("when tabbing inside the range", () => {
    it("lets the browser move on its own", () => {
      // Act
      const result = nextFocusIndex(4, 1, false);

      // Assert
      expect(result).toBeNull();
    });

    it("lets the browser move backwards on its own", () => {
      // Act
      const result = nextFocusIndex(4, 2, true);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("when tabbing past an edge", () => {
    it("wraps from the last element to the first", () => {
      // Act
      const result = nextFocusIndex(4, 3, false);

      // Assert
      expect(result).toBe(0);
    });

    it("wraps from the first element to the last", () => {
      // Act
      const result = nextFocusIndex(4, 0, true);

      // Assert
      expect(result).toBe(3);
    });
  });

  describe("when focus escaped the trap", () => {
    it("pulls focus back to the first element", () => {
      // Act
      const result = nextFocusIndex(4, -1, false);

      // Assert
      expect(result).toBe(0);
    });

    it("pulls focus back to the last element when going backwards", () => {
      // Act
      const result = nextFocusIndex(4, -1, true);

      // Assert
      expect(result).toBe(3);
    });
  });

  describe("when the panel has a single focusable element", () => {
    it("keeps focus on it in both directions", () => {
      // Act
      const forward = nextFocusIndex(1, 0, false);
      const backward = nextFocusIndex(1, 0, true);

      // Assert
      expect(forward).toBe(0);
      expect(backward).toBe(0);
    });
  });

  describe("when the panel has nothing focusable", () => {
    it("reports no target so the caller can hold focus on the panel", () => {
      // Act
      const result = nextFocusIndex(0, -1, false);

      // Assert
      expect(result).toBeNull();
    });
  });
});
