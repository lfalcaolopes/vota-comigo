"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useMountTransition } from "../hooks/use-mount-transition";
import { joinClassNames } from "./utils";

const TRANSITION_MS = 180;
const PANEL_WIDTH = 320;
const VIEWPORT_GAP = 8;
const ANCHORED_QUERY = "(min-width: 40rem)";

type HelpPopoverAlign = "start" | "center" | "end";

type AnchoredPosition = { top: number; left: number; maxHeight: number };

type HelpPopoverProps = {
  title: string;
  children: ReactNode;
  align?: HelpPopoverAlign;
  className?: string;
  label?: string;
};

export function HelpPopover({
  align = "center",
  children,
  className,
  label,
  title,
}: HelpPopoverProps) {
  const panelId = useId();
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const { isMounted, isVisible } = useMountTransition(isOpen, TRANSITION_MS);
  const [isAnchored, setIsAnchored] = useState(false);
  const [position, setPosition] = useState<AnchoredPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // The panel lives in a portal, so it is positioned from the trigger rect
  // instead of an absolute offset that ancestors with overflow would clip.
  useLayoutEffect(() => {
    if (!isMounted) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (trigger === null) return;
      const anchored = window.matchMedia(ANCHORED_QUERY).matches;
      setIsAnchored(anchored);
      if (!anchored) {
        setPosition(null);
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const anchors: Record<HelpPopoverAlign, number> = {
        start: rect.left,
        center: rect.left + rect.width / 2 - PANEL_WIDTH / 2,
        end: rect.right - PANEL_WIDTH,
      };
      const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_GAP;
      const left = Math.min(Math.max(anchors[align], VIEWPORT_GAP), maxLeft);

      // Flip above the trigger when the panel would not fit below, so a trigger
      // near the bottom of the viewport does not open into a cut-off panel.
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP * 2;
      const spaceAbove = rect.top - VIEWPORT_GAP * 2;
      const panelHeight = panelRef.current?.scrollHeight ?? 0;
      const flip = panelHeight > spaceBelow && spaceAbove > spaceBelow;
      const maxHeight = Math.max(flip ? spaceAbove : spaceBelow, 0);

      setPosition({
        top: flip
          ? Math.max(
              rect.top - VIEWPORT_GAP - Math.min(panelHeight, maxHeight),
              VIEWPORT_GAP,
            )
          : rect.bottom + VIEWPORT_GAP,
        left,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isMounted, align]);

  useEffect(() => {
    if (!isOpen || !isMounted) return;
    closeRef.current?.focus();
  }, [isOpen, isMounted]);

  // Close on Escape or on any pointer press outside the trigger and panel.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, close]);

  return (
    <>
      <button
        aria-controls={isMounted ? panelId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={label ?? `Mais informações sobre ${title}`}
        // The pseudo-element widens the tap target without changing the layout.
        className={joinClassNames(
          "relative inline-flex size-4.5 shrink-0 items-center justify-center rounded-full bg-info align-middle text-[0.6875rem] font-[680] leading-none text-white transition-colors duration-[180ms] ease-standard after:absolute after:-inset-2.5 after:content-[''] hover:bg-ink focus-visible:bg-ink",
          className,
        )}
        onClick={() => {
          // Settle the mode before the panel first renders, so it is measured
          // at the width it will actually use.
          setIsAnchored(window.matchMedia(ANCHORED_QUERY).matches);
          setIsOpen((current) => !current);
        }}
        ref={triggerRef}
        type="button"
      >
        ?
      </button>

      {isMounted
        ? createPortal(
            <>
              <div
                aria-hidden="true"
                className={joinClassNames(
                  "fixed inset-0 z-50 bg-ink/40 transition-opacity duration-[180ms] ease-standard sm:hidden",
                  isVisible ? "opacity-100" : "opacity-0",
                )}
              />
              <div
                aria-labelledby={titleId}
                className={joinClassNames(
                  "fixed z-50 grid gap-2 overflow-y-auto rounded-lg border border-border bg-white p-4 text-left shadow-popover transition-opacity duration-[180ms] ease-standard sm:p-3",
                  isAnchored
                    ? "w-80"
                    : "top-1/2 left-1/2 max-h-[80vh] w-[calc(100vw-2rem)] max-w-90 -translate-x-1/2 -translate-y-1/2",
                  isVisible ? "opacity-100" : "opacity-0",
                )}
                id={panelId}
                ref={panelRef}
                role="dialog"
                style={
                  position === null
                    ? undefined
                    : {
                        top: position.top,
                        left: position.left,
                        maxHeight: position.maxHeight,
                      }
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <h2
                    className="text-sm font-[680] leading-snug text-ink"
                    id={titleId}
                  >
                    {title}
                  </h2>
                  <button
                    aria-label="Fechar"
                    className="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md p-1 text-muted transition-colors duration-[180ms] ease-standard hover:bg-surface-muted hover:text-ink"
                    onClick={close}
                    ref={closeRef}
                    type="button"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="text-sm leading-normal text-muted">
                  {children}
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 14 14"
      width="14"
    >
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}
