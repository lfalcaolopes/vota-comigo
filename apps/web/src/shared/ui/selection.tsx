import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { joinClassNames } from "./utils";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

const chip =
  "inline-flex min-h-9 items-center rounded-full border border-border bg-white px-3 py-1.5 text-sm font-semibold leading-[1.2] text-ink transition-[background-color,border-color,color] duration-[180ms] ease-standard aria-pressed:border-primary aria-pressed:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55";

export function Chip({
  className,
  selected = false,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      aria-pressed={selected}
      className={joinClassNames(chip, className)}
      type={type}
      {...props}
    />
  );
}

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-muted text-muted",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-strong",
  danger: "bg-danger-soft text-danger",
};

type BadgeProps = {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
};

export function Badge({ children, className, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={joinClassNames(
        "inline-flex max-w-full min-h-7 items-center gap-1 rounded-full border border-transparent px-2.5 py-1 text-xs font-[680] leading-[1.2] [overflow-wrap:anywhere]",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

type TabItem = {
  id: string;
  label: string;
};

const tabBar =
  "inline-flex max-w-full flex-wrap items-center gap-1 rounded-md border border-border bg-surface-muted p-1";

const tabItem =
  "min-h-9 rounded-sm border-0 bg-transparent px-3 py-1.5 text-sm font-[650] text-muted";

type TabsProps = {
  activeId: string;
  items: TabItem[];
  label: string;
};

export function Tabs({ activeId, items, label }: TabsProps) {
  return (
    <div aria-label={label} className={tabBar} role="tablist">
      {items.map((item) => (
        <button
          aria-selected={item.id === activeId}
          className={joinClassNames(
            tabItem,
            "aria-selected:bg-white aria-selected:text-ink",
          )}
          key={item.id}
          role="tab"
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

type SegmentedControlProps = {
  activeId: string;
  items: TabItem[];
  label: string;
  onSelect?: (id: string) => void;
};

export function SegmentedControl({
  activeId,
  items,
  label,
  onSelect,
}: SegmentedControlProps) {
  return (
    <div aria-label={label} className={tabBar} role="group">
      {items.map((item) => (
        <button
          aria-pressed={item.id === activeId}
          className={joinClassNames(
            tabItem,
            "aria-pressed:bg-white aria-pressed:text-ink",
          )}
          key={item.id}
          onClick={() => onSelect?.(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

type ChoiceProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hideLabel?: boolean;
};

const choice = "inline-flex items-center gap-2 text-sm font-semibold text-ink";

export function Checkbox({ className, hideLabel = false, label, ...props }: ChoiceProps) {
  return (
    <label className={joinClassNames(choice, className)}>
      <input className="size-4.5 accent-primary" type="checkbox" {...props} />
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
    </label>
  );
}

export function Radio({ className, label, ...props }: ChoiceProps) {
  return (
    <label className={joinClassNames(choice, className)}>
      <input className="size-4.5 accent-primary" type="radio" {...props} />
      <span>{label}</span>
    </label>
  );
}

type SwitchProps = Omit<ChoiceProps, "type">;

export function Switch({ className, label, ...props }: SwitchProps) {
  return (
    <label className={joinClassNames(choice, className)}>
      <input className="peer sr-only" type="checkbox" {...props} />
      <span
        aria-hidden="true"
        className="inline-flex h-6 w-10 items-center rounded-full bg-border-strong p-0.5 transition-colors duration-[180ms] ease-standard peer-checked:bg-primary peer-checked:[&>span]:translate-x-4"
      >
        <span className="size-5 rounded-full bg-white transition-transform duration-[180ms] ease-standard" />
      </span>
      <span>{label}</span>
    </label>
  );
}
