import { describe, expect, it } from "vitest";

import {
  anchoredPopoverPosition,
  isAnchoredPopoverUsable,
  isTriggerMostlyHidden,
} from "../popover-position";

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

  describe("when the trigger scrolls past the top of the viewport", () => {
    it("keeps the panel inside the top edge", () => {
      // Act
      const result = position({
        panelHeight: 600,
        trigger: { top: -60, right: 500, bottom: -20, left: 400 },
      });

      // Assert
      expect(result.top).toBe(GAP);
    });

    it("never grows taller than the viewport", () => {
      // Act
      const result = position({
        panelHeight: 600,
        trigger: { top: -400, right: 500, bottom: -360, left: 400 },
      });

      // Assert
      expect(result.maxHeight).toBe(VIEWPORT.height - GAP * 2);
    });
  });

  describe("when the trigger scrolls past the bottom of the viewport", () => {
    it("keeps the flipped panel inside the bottom edge", () => {
      // Act
      const result = position({
        panelHeight: 1200,
        trigger: { top: 1200, right: 500, bottom: 1240, left: 400 },
      });

      // Assert
      expect(result.top).toBe(GAP);
      expect(result.top + result.maxHeight).toBe(VIEWPORT.height - GAP);
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

  describe("when the size was measured on a previous call", () => {
    it("keeps the locked height even when the trigger frees more room", () => {
      // Arrange
      const opened = position({
        panelHeight: 200,
        trigger: { top: 500, right: 500, bottom: 540, left: 400 },
      });

      // Act
      const scrolled = position({
        locked: opened,
        panelHeight: 200,
        trigger: { top: 100, right: 500, bottom: 140, left: 400 },
      });

      // Assert
      expect(opened.maxHeight).toBe(800 - 540 - GAP * 2);
      expect(scrolled.maxHeight).toBe(opened.maxHeight);
    });

    it("keeps following the trigger with the locked height", () => {
      // Arrange
      const opened = position({ panelHeight: 100 });

      // Act
      const scrolled = position({
        locked: opened,
        panelHeight: 100,
        trigger: { top: 60, right: 500, bottom: 100, left: 400 },
      });

      // Assert
      expect(scrolled.top).toBe(100 + GAP);
    });

    it("keeps the locked flip instead of dropping back below the trigger", () => {
      // Arrange
      const opened = position({
        panelHeight: 300,
        trigger: { top: 600, right: 500, bottom: 640, left: 400 },
      });

      // Act
      const scrolled = position({
        locked: opened,
        panelHeight: 300,
        trigger: { top: 400, right: 500, bottom: 440, left: 400 },
      });

      // Assert
      expect(opened.flip).toBe(true);
      expect(scrolled.top).toBe(400 - GAP - 300);
    });
  });
});

describe("isAnchoredPopoverUsable", () => {
  describe("when a tall panel has little room around its trigger", () => {
    it("uses a viewport presentation instead", () => {
      // Act
      const result = isAnchoredPopoverUsable({
        availableHeight: 420,
        minimumHeight: 480,
        panelHeight: 700,
      });

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("when a tall panel has a comfortable selectable area", () => {
    it("keeps the panel anchored", () => {
      // Act
      const result = isAnchoredPopoverUsable({
        availableHeight: 480,
        minimumHeight: 480,
        panelHeight: 700,
      });

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("when the panel is shorter than the minimum", () => {
    it("keeps it anchored when its full content fits", () => {
      // Act
      const result = isAnchoredPopoverUsable({
        availableHeight: 180,
        minimumHeight: 320,
        panelHeight: 180,
      });

      // Assert
      expect(result).toBe(true);
    });
  });
});

describe("isTriggerMostlyHidden", () => {
  describe("when the trigger is comfortably visible", () => {
    it("keeps it in view", () => {
      // Act
      const result = isTriggerMostlyHidden(
        { top: 100, right: 500, bottom: 140, left: 400 },
        VIEWPORT,
      );

      // Assert
      expect(result).toBe(false);
    });

    it("keeps it in view while less than half of it is cut", () => {
      // Act
      const result = isTriggerMostlyHidden(
        { top: -13, right: 500, bottom: 27, left: 400 },
        VIEWPORT,
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("when the trigger is about to leave the viewport", () => {
    it("gives it up once more than half is cut at the top", () => {
      // Act
      const result = isTriggerMostlyHidden(
        { top: -30, right: 500, bottom: 10, left: 400 },
        VIEWPORT,
      );

      // Assert
      expect(result).toBe(true);
    });

    it("gives it up once more than half is cut at the bottom", () => {
      // Act
      const result = isTriggerMostlyHidden(
        { top: 790, right: 500, bottom: 830, left: 400 },
        VIEWPORT,
      );

      // Assert
      expect(result).toBe(true);
    });

    it("gives it up once more than half is cut sideways", () => {
      // Act
      const result = isTriggerMostlyHidden(
        { top: 100, right: 30, bottom: 140, left: -70 },
        VIEWPORT,
      );

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("when the trigger scrolled out of the viewport", () => {
    it("gives it up past the top", () => {
      // Act
      const result = isTriggerMostlyHidden(
        { top: -60, right: 500, bottom: -20, left: 400 },
        VIEWPORT,
      );

      // Assert
      expect(result).toBe(true);
    });

    it("gives it up past the bottom", () => {
      // Act
      const result = isTriggerMostlyHidden(
        { top: 900, right: 500, bottom: 940, left: 400 },
        VIEWPORT,
      );

      // Assert
      expect(result).toBe(true);
    });
  });
});
