const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Returns the index to move focus to, or null when the browser's own Tab
// handling already keeps focus inside the container.
export function nextFocusIndex(
  count: number,
  currentIndex: number,
  backwards: boolean,
): number | null {
  if (count === 0) return null;
  if (currentIndex === -1) return backwards ? count - 1 : 0;
  if (backwards && currentIndex === 0) return count - 1;
  if (!backwards && currentIndex === count - 1) return 0;
  return null;
}

export function focusableElements(
  container: HTMLElement,
): readonly HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => element.offsetParent !== null || element === container);
}

export function trapFocus(container: HTMLElement, event: KeyboardEvent) {
  const elements = focusableElements(container);
  const active = document.activeElement;
  const currentIndex =
    active instanceof HTMLElement ? elements.indexOf(active) : -1;
  const target = nextFocusIndex(elements.length, currentIndex, event.shiftKey);

  if (target === null) {
    if (elements.length === 0) {
      event.preventDefault();
      container.focus();
    }
    return;
  }

  event.preventDefault();
  elements[target].focus();
}
