import type { InputHTMLAttributes, ReactNode } from "react";
import { joinClassNames } from "./utils";

const fieldControl =
  "w-full min-h-11 rounded-md border border-border bg-white px-3 py-2.5 text-base leading-[1.4] text-ink transition-[border-color,background-color,box-shadow] duration-[180ms] ease-standard placeholder:text-muted placeholder:opacity-100 not-disabled:hover:border-border-strong disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted aria-[invalid=true]:border-danger";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  helperText?: string;
  hideLabel?: boolean;
  label: string;
};

export function TextField({
  className,
  error,
  helperText,
  hideLabel = false,
  id,
  label,
  ...props
}: TextFieldProps) {
  const message = error ?? helperText;
  const messageId = message && id ? `${id}-message` : undefined;

  return (
    <label className="grid gap-2" htmlFor={id}>
      <span
        className={joinClassNames(
          "text-sm font-[650] leading-[1.3] text-ink",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </span>
      <input
        aria-describedby={messageId}
        aria-invalid={error ? true : undefined}
        className={joinClassNames(fieldControl, className)}
        id={id}
        {...props}
      />
      {message ? (
        <span
          className={joinClassNames(
            "text-sm leading-snug",
            error ? "text-danger" : "text-muted",
          )}
          id={messageId}
        >
          {message}
        </span>
      ) : null}
    </label>
  );
}

type SearchFieldProps = Omit<TextFieldProps, "type"> & {
  icon?: ReactNode;
};

export function SearchField({
  className,
  icon = <SearchIcon />,
  ...props
}: SearchFieldProps) {
  return (
    <div className="relative">
      {icon}
      <TextField className={joinClassNames("pl-9", className)} type="search" {...props} />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m14.5 14.5 3 3m-1.35-8.15a6.3 6.3 0 1 1-12.6 0 6.3 6.3 0 0 1 12.6 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
