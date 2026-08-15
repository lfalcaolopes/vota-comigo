export type PopoverAlign = "start" | "center" | "end";

export type PopoverTriggerRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type PopoverViewport = { width: number; height: number };

export type PopoverPosition = { top: number; left: number; maxHeight: number };

type AnchoredPopoverInput = {
  align: PopoverAlign;
  gap: number;
  panelHeight: number;
  panelWidth: number;
  trigger: PopoverTriggerRect;
  viewport: PopoverViewport;
};

export function anchoredPopoverPosition({
  align,
  gap,
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

  const spaceBelow = viewport.height - trigger.bottom - gap * 2;
  const spaceAbove = trigger.top - gap * 2;
  const flip = panelHeight > spaceBelow && spaceAbove > spaceBelow;
  const maxHeight = Math.max(flip ? spaceAbove : spaceBelow, 0);
  const top = flip
    ? Math.max(trigger.top - gap - Math.min(panelHeight, maxHeight), gap)
    : trigger.bottom + gap;

  return { top, left, maxHeight };
}
