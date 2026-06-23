import type { SVGProps } from "react";

export function ArrowLeftIcon({
  className = "size-4 shrink-0",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20" {...props}>
      <path
        d="M15.5 10H5.5m4-4.5L5 10l4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
