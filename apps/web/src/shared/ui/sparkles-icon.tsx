import type { SVGProps } from "react";

export function SparklesIcon({
  className = "size-4 shrink-0 text-primary",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20" {...props}>
      <path
        d="M8.5 2.5c.6 3.4 2.6 5.4 6 6-3.4.6-5.4 2.6-6 6-.6-3.4-2.6-5.4-6-6 3.4-.6 5.4-2.6 6-6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M15.5 11.5c.25 1.4 1.1 2.25 2.5 2.5-1.4.25-2.25 1.1-2.5 2.5-.25-1.4-1.1-2.25-2.5-2.5 1.4-.25 2.25-1.1 2.5-2.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
