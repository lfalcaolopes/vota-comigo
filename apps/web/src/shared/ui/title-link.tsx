import Link from "next/link";
import type { ReactNode } from "react";

import { ExternalLinkIcon } from "./external-link-icon";
import { joinClassNames } from "./utils";

// O sublinhado precisa existir em repouso: hover nao chega ao toque, e no
// comparativo o titulo fica lado a lado com titulos que nao levam a lugar nenhum.
const AFFORDANCE_CLASS_NAME =
  "break-words text-ink underline decoration-ink/45 underline-offset-[0.18em] transition-[text-decoration-color] duration-[180ms] ease-standard hover:decoration-ink";

export function TitleLink({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <Link
      className={joinClassNames(AFFORDANCE_CLASS_NAME, className)}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
      <ExternalLinkIcon className="ml-1 inline-block size-[0.9em] -translate-y-[0.08em] text-subtle" />
    </Link>
  );
}
