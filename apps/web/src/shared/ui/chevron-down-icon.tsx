import type { SVGProps } from "react";

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      height="12"
      viewBox="0 0 16 16"
      width="12"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
