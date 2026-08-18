"use client";

import type { ReactNode } from "react";
import { useId, useRef, useState } from "react";

import { Popover } from "./popover";
import type { PopoverAlign } from "./popover-position";
import { joinClassNames } from "./utils";

type HelpPopoverProps = {
  title: string;
  children: ReactNode;
  align?: PopoverAlign;
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        aria-controls={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={label ?? `Mais informações sobre ${title}`}
        // The pseudo-element widens the tap target without changing the layout.
        className={joinClassNames(
          "relative inline-flex size-4.5 shrink-0 items-center justify-center rounded-full align-middle transition-colors duration-[180ms] ease-standard after:absolute after:-inset-2.5 after:content-[''] hover:bg-surface-muted hover:text-ink",
          isOpen ? "bg-surface-muted text-ink" : "text-subtle",
          className,
        )}
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <HelpIcon />
      </button>

      <Popover
        align={align}
        ariaLabelledBy={titleId}
        className="grid gap-2 p-4 sm:p-3"
        id={panelId}
        initialFocusRef={closeRef}
        isOpen={isOpen}
        mobile="centered"
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-[680] leading-snug text-ink" id={titleId}>
            {title}
          </h2>
          <button
            aria-label="Fechar"
            className="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md p-1 text-muted transition-colors duration-[180ms] ease-standard hover:bg-surface-muted hover:text-ink"
            onClick={() => setIsOpen(false)}
            ref={closeRef}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="text-sm leading-normal text-muted">{children}</div>
      </Popover>
    </>
  );
}

function HelpIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.6"
      viewBox="0 0 16 16"
    >
      <circle cx="8" cy="8" r="6.2" />
      <path d="M6.3 6.15a1.75 1.75 0 1 1 1.95 1.8v.75" />
      <path d="M8.25 11.15h.01" />
    </svg>
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
