import { describe, expect, it } from "vitest";

import { anchoredPopoverPosition } from "../popover-position";

const GAP = 8;
const PANEL_WIDTH = 320;
const VIEWPORT = { width: 1280, height: 800 };

function position(
  overrides: Partial<Parameters<typeof anchoredPopoverPosition>[0]> = {},
) {
  return anchoredPopoverPosition({
    align: "center",
    gap: GAP,
    panelHeight: 200,
    panelWidth: PANEL_WIDTH,
    trigger: { top: 100, right: 500, bottom: 140, left: 400 },
    viewport: VIEWPORT,
    ...overrides,
  });
}

describe("anchoredPopoverPosition", () => {
  describe("when the panel fits below the trigger", () => {
    it("opens below, separated by the gap", () => {
      // Act
      const result = position();

      // Assert
      expect(result.top).toBe(148);
      expect(result.maxHeight).toBe(800 - 140 - GAP * 2);
    });
  });

  describe("when aligning horizontally", () => {
    it("starts at the trigger left edge", () => {
      // Act
      const result = position({ align: "start" });

      // Assert
      expect(result.left).toBe(400);
    });

    it("centers the panel on the trigger", () => {
      // Act
      const result = position({ align: "center" });

      // Assert
      expect(result.left).toBe(450 - PANEL_WIDTH / 2);
    });

    it("ends at the trigger right edge", () => {
      // Act
      const result = position({ align: "end" });

      // Assert
      expect(result.left).toBe(500 - PANEL_WIDTH);
    });
  });

  describe("when the preferred alignment leaves the viewport", () => {
    it("keeps the panel inside the right edge", () => {
      // Act
      const result = position({
        align: "start",
        trigger: { top: 100, right: 1270, bottom: 140, left: 1240 },
      });

      // Assert
      expect(result.left).toBe(VIEWPORT.width - PANEL_WIDTH - GAP);
    });

    it("keeps the panel inside the left edge", () => {
      // Act
      const result = position({
        align: "end",
        trigger: { top: 100, right: 40, bottom: 140, left: 10 },
      });

      // Assert
      expect(result.left).toBe(GAP);
    });

    it("prefers the left edge when the viewport is narrower than the panel", () => {
      // Act
      const result = position({
        align: "center",
        viewport: { width: 280, height: 800 },
      });

      // Assert
      expect(result.left).toBe(GAP);
    });
  });

  describe("when the panel does not fit below the trigger", () => {
    it("flips above when there is more room there", () => {
      // Act
      const result = position({
        panelHeight: 400,
        trigger: { top: 600, right: 500, bottom: 640, left: 400 },
      });

      // Assert
      expect(result.top).toBe(600 - GAP - 400);
      expect(result.maxHeight).toBe(600 - GAP * 2);
    });

    it("stays below when the room above is not better", () => {
      // Act
      const result = position({
        panelHeight: 400,
        trigger: { top: 100, right: 500, bottom: 140, left: 400 },
      });

      // Assert
      expect(result.top).toBe(148);
      expect(result.maxHeight).toBe(800 - 140 - GAP * 2);
    });

    it("caps the flipped panel at the gap instead of leaving the viewport", () => {
      // Act
      const result = position({
        panelHeight: 400,
        trigger: { top: 120, right: 500, bottom: 780, left: 400 },
      });

      // Assert
      expect(result.top).toBe(GAP);
      expect(result.maxHeight).toBe(120 - GAP * 2);
    });
  });

  describe("when the trigger leaves no room on either side", () => {
    it("never reports a negative maxHeight", () => {
      // Act
      const result = position({
        trigger: { top: 5, right: 500, bottom: 800, left: 400 },
      });

      // Assert
      expect(result.maxHeight).toBe(0);
      expect(result.top).toBe(GAP);
    });
  });
});
