import type { InputHTMLAttributes, ReactNode } from "react";
import { joinClassNames } from "./utils";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  helperText?: string;
  label: string;
};

export function TextField({
  className,
  error,
  helperText,
  id,
  label,
  ...props
}: TextFieldProps) {
  const message = error ?? helperText;
  const messageId = message && id ? `${id}-message` : undefined;

  return (
    <label className="vc-field" htmlFor={id}>
      <span className="vc-label">{label}</span>
      <input
        aria-describedby={messageId}
        aria-invalid={error ? true : undefined}
        className={joinClassNames("vc-field__control", className)}
        id={id}
        {...props}
      />
      {message ? (
        <span
          className={joinClassNames(
            "vc-field__message",
            error && "vc-field__message--error",
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
    <div className="vc-search">
      {icon}
      <TextField className={className} type="search" {...props} />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
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
