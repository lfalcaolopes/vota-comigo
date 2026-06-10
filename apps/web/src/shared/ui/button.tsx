import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { joinClassNames } from "./utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

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
      className={joinClassNames("vc-button", `vc-button--${variant}`, className)}
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
      className={joinClassNames("vc-button", `vc-button--${variant}`, className)}
      {...props}
    />
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  variant?: ButtonVariant;
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
        "vc-button",
        "vc-icon-button",
        `vc-button--${variant}`,
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
