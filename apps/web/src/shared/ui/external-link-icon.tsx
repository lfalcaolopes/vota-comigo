import type { SVGProps } from "react";

export function ExternalLinkIcon({
  className = "size-4 shrink-0",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 16 16"
      {...props}
    >
      <path
        d="M6.25 3.75h6m0 0v6m0-6-7 7M4.75 5.5H3.5a1.5 1.5 0 0 0-1.5 1.5v5.5A1.5 1.5 0 0 0 3.5 14h5.5a1.5 1.5 0 0 0 1.5-1.5v-1.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
