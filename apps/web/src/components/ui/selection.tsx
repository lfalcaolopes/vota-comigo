import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { joinClassNames } from "./utils";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function Chip({
  className,
  selected = false,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      aria-pressed={selected}
      className={joinClassNames("vc-chip", className)}
      data-selected={selected}
      type={type}
      {...props}
    />
  );
}

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

type BadgeProps = {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
};

export function Badge({ children, className, tone = "neutral" }: BadgeProps) {
  return (
    <span className={joinClassNames("vc-badge", `vc-badge--${tone}`, className)}>
      {children}
    </span>
  );
}

type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  activeId: string;
  items: TabItem[];
  label: string;
};

export function Tabs({ activeId, items, label }: TabsProps) {
  return (
    <div aria-label={label} className="vc-tabs" role="tablist">
      {items.map((item) => (
        <button
          aria-selected={item.id === activeId}
          className="vc-tab"
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
};

export function SegmentedControl({
  activeId,
  items,
  label,
}: SegmentedControlProps) {
  return (
    <div aria-label={label} className="vc-segmented" role="group">
      {items.map((item) => (
        <button
          aria-pressed={item.id === activeId}
          className="vc-segmented__item"
          key={item.id}
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
};

export function Checkbox({ className, label, ...props }: ChoiceProps) {
  return (
    <label className={joinClassNames("vc-choice", className)}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Radio({ className, label, ...props }: ChoiceProps) {
  return (
    <label className={joinClassNames("vc-choice", className)}>
      <input type="radio" {...props} />
      <span>{label}</span>
    </label>
  );
}

type SwitchProps = Omit<ChoiceProps, "type">;

export function Switch({ className, label, ...props }: SwitchProps) {
  return (
    <label className={joinClassNames("vc-switch", className)}>
      <input type="checkbox" {...props} />
      <span className="vc-switch__track" aria-hidden="true">
        <span className="vc-switch__thumb" />
      </span>
      <span>{label}</span>
    </label>
  );
}
