export type PopoverAlign = "start" | "center" | "end";

export type PopoverTriggerRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type PopoverViewport = { width: number; height: number };

export type PopoverPosition = {
  top: number;
  left: number;
  maxHeight: number;
  flip: boolean;
};

export type PopoverSizeLock = { maxHeight: number; flip: boolean };

type AnchoredPopoverUsabilityInput = {
  availableHeight: number;
  minimumHeight: number;
  panelHeight: number;
};

export function isAnchoredPopoverUsable({
  availableHeight,
  minimumHeight,
  panelHeight,
}: AnchoredPopoverUsabilityInput): boolean {
  return availableHeight >= Math.min(panelHeight, minimumHeight);
}

type AnchoredPopoverInput = {
  align: PopoverAlign;
  gap: number;
  panelHeight: number;
  panelWidth: number;
  trigger: PopoverTriggerRect;
  viewport: PopoverViewport;
  locked?: PopoverSizeLock;
};

export function anchoredPopoverPosition({
  align,
  gap,
  locked,
  panelHeight,
  panelWidth,
  trigger,
  viewport,
}: AnchoredPopoverInput): PopoverPosition {
  const anchors: Record<PopoverAlign, number> = {
    start: trigger.left,
    center: trigger.left + (trigger.right - trigger.left) / 2 - panelWidth / 2,
    end: trigger.right - panelWidth,
  };
  const maxLeft = viewport.width - panelWidth - gap;
  const left = Math.max(Math.min(anchors[align], maxLeft), gap);

  // Scrolling can push the trigger outside the viewport, and the space it
  // leaves on the opposite side then exceeds the screen itself.
  const available = Math.max(viewport.height - gap * 2, 0);
  const spaceBelow = Math.min(
    viewport.height - trigger.bottom - gap * 2,
    available,
  );
  const spaceAbove = Math.min(trigger.top - gap * 2, available);
  // Size and side are measured once per opening: recomputing them while the
  // page scrolls made the panel grow as the trigger moved up.
  const flip =
    locked?.flip ?? (panelHeight > spaceBelow && spaceAbove > spaceBelow);
  const maxHeight =
    locked?.maxHeight ?? Math.max(flip ? spaceAbove : spaceBelow, 0);
  const height = Math.min(panelHeight, maxHeight);
  const rawTop = flip ? trigger.top - gap - height : trigger.bottom + gap;
  const maxTop = Math.max(viewport.height - gap - height, gap);
  const top = Math.min(Math.max(rawTop, gap), maxTop);

  return { top, left, maxHeight, flip };
}

// Waiting for the trigger to disappear entirely leaves the panel hanging over
// the edge with nothing anchoring it, so it is given up while a sliver is left.
const MIN_VISIBLE_RATIO = 0.5;

export function isTriggerMostlyHidden(
  trigger: PopoverTriggerRect,
  viewport: PopoverViewport,
): boolean {
  const visibleHeight =
    Math.min(trigger.bottom, viewport.height) - Math.max(trigger.top, 0);
  const visibleWidth =
    Math.min(trigger.right, viewport.width) - Math.max(trigger.left, 0);

  return (
    visibleHeight < (trigger.bottom - trigger.top) * MIN_VISIBLE_RATIO ||
    visibleWidth < (trigger.right - trigger.left) * MIN_VISIBLE_RATIO
  );
}
