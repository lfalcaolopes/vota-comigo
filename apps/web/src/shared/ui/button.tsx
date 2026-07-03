import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import { joinClassNames } from "./utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

const baseButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-[650] leading-[1.2] text-ink no-underline transition-[background-color,border-color,color,translate] duration-[180ms] ease-standard not-disabled:hover:-translate-y-px not-disabled:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-primary text-white not-disabled:hover:bg-primary-hover",
  secondary:
    "border-border-strong bg-white text-ink not-disabled:hover:border-ink not-disabled:hover:bg-surface-muted",
  ghost:
    "border-transparent bg-transparent text-ink not-disabled:hover:bg-surface-muted",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  className,
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={joinClassNames(baseButton, buttonVariants[variant], className)}
      type={type}
      {...props}
    />
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
};

export function ButtonLink({
  className,
  variant = "secondary",
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={joinClassNames(baseButton, buttonVariants[variant], className)}
      {...props}
    />
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  variant?: ButtonVariant;
  ref?: Ref<HTMLButtonElement>;
};

export function IconButton({
  children,
  className,
  label,
  type = "button",
  variant = "secondary",
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={joinClassNames(
        baseButton,
        buttonVariants[variant],
        "w-11 min-w-11 p-0",
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
