"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useMountTransition } from "../hooks/use-mount-transition";
import { trapFocus } from "./focus-trap";
import type { PopoverAlign, PopoverPosition } from "./popover-position";
import { anchoredPopoverPosition } from "./popover-position";
import { joinClassNames } from "./utils";

export const POPOVER_TRANSITION_MS = 180;

const VIEWPORT_GAP = 8;
const DEFAULT_WIDTH = 320;
const ANCHORED_QUERY = "(min-width: 40rem)";

export type PopoverMobileMode = "sheet" | "centered";

type PopoverProps = {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: PopoverAlign;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  id?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  mobile?: PopoverMobileMode;
  width?: number;
};

export function Popover({
  align = "center",
  ariaLabel,
  ariaLabelledBy,
  children,
  className,
  id,
  initialFocusRef,
  isOpen,
  mobile = "sheet",
  onClose,
  triggerRef,
  width = DEFAULT_WIDTH,
}: PopoverProps) {
  const { isMounted, isVisible } = useMountTransition(
    isOpen,
    POPOVER_TRANSITION_MS,
  );
  const [isAnchored, setIsAnchored] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // A pointer press outside already moved the user's attention elsewhere, so
  // only closes that leave focus inside the panel hand it back to the trigger.
  const shouldRestoreFocusRef = useRef(true);
  const wasOpenRef = useRef(false);

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
      setPosition(
        anchoredPopoverPosition({
          align,
          gap: VIEWPORT_GAP,
          panelHeight: panelRef.current?.scrollHeight ?? 0,
          panelWidth: width,
          trigger: rect,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        }),
      );
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
    // isAnchored re-runs the measurement once the panel carries the classes of
    // the mode it settled on, so the flip decision reads its real height.
  }, [isMounted, isAnchored, align, width, triggerRef]);

  useEffect(() => {
    if (!isOpen || !isMounted) return;
    shouldRestoreFocusRef.current = true;
    const target = initialFocusRef?.current ?? panelRef.current;
    target?.focus();
  }, [isOpen, isMounted, initialFocusRef]);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    if (!shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    triggerRef.current?.focus();
  }, [isOpen, triggerRef]);

  // The overlay covers the page on small screens, so the list behind it must
  // not scroll away under the sheet.
  useEffect(() => {
    if (!isMounted || isAnchored) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMounted, isAnchored]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (panel === null) return;
      trapFocus(panel, event);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      shouldRestoreFocusRef.current = false;
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isMounted) return null;

  const isSheet = !isAnchored && mobile === "sheet";

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className={joinClassNames(
          "fixed inset-0 z-popover bg-ink/40 transition-opacity duration-[180ms] ease-standard sm:hidden",
          isVisible ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-modal={isAnchored ? undefined : true}
        className={joinClassNames(
          "fixed z-popover overflow-y-auto border border-border bg-white text-left shadow-popover transition-[opacity,transform] duration-[180ms] ease-standard focus-visible:outline-none",
          isAnchored && "rounded-lg",
          isSheet &&
            "inset-x-0 bottom-0 max-h-[85vh] rounded-t-lg pb-[env(safe-area-inset-bottom)]",
          !isAnchored &&
            !isSheet &&
            "top-1/2 left-1/2 max-h-[80vh] w-[calc(100vw-2rem)] max-w-90 -translate-x-1/2 -translate-y-1/2 rounded-lg",
          isVisible ? "opacity-100" : "opacity-0",
          isSheet && !isVisible && "motion-safe:translate-y-4",
          className,
        )}
        id={id}
        ref={panelRef}
        role="dialog"
        style={
          isAnchored && position !== null
            ? {
                top: position.top,
                left: position.left,
                maxHeight: position.maxHeight,
                width,
              }
            : undefined
        }
        tabIndex={-1}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
