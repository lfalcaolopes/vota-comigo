import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from "react";
import { Button } from "./button";
import { joinClassNames } from "./utils";

type PanelProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    title?: string;
  }
>;

export function Panel({ children, className, title, ...props }: PanelProps) {
  return (
    <section
      className={joinClassNames(
        "min-w-0 rounded-lg border border-border bg-surface",
        className,
      )}
      {...props}
    >
      {title ? (
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <h2 className="text-lg font-[680] leading-snug text-ink">{title}</h2>
        </div>
      ) : null}
      <div className="grid min-w-0 gap-4 p-5">{children}</div>
    </section>
  );
}

type InlineMessageProps = {
  body: string;
  title: string;
  tone?: "neutral" | "danger" | "warning";
};

export function InlineMessage({
  body,
  title,
  tone = "neutral",
}: InlineMessageProps) {
  function toneClass() {
    if (tone === "danger") return "border-danger-border bg-danger-soft";
    if (tone === "warning") return "border-warning-border bg-warning-soft";
    return "border-border bg-surface-muted";
  }

  return (
    <div
      className={joinClassNames(
        "grid gap-2 rounded-md border p-4 text-ink",
        toneClass(),
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      <p className="text-sm font-[720]">{title}</p>
      <p className="text-sm leading-normal text-muted">{body}</p>
    </div>
  );
}

type DisclosureProps = PropsWithChildren<{
  summary: string;
  defaultOpen?: boolean;
}>;

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: DisclosureProps) {
  return (
    <details
      className="group rounded-md border border-border bg-surface-muted text-sm"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-[650] text-ink [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <svg
          aria-hidden="true"
          className="shrink-0 text-subtle transition-transform group-open:rotate-180"
          fill="none"
          height="16"
          viewBox="0 0 16 16"
          width="16"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </summary>
      <div className="grid gap-2 border-t border-border px-4 py-3 leading-normal text-muted">
        {children}
      </div>
    </details>
  );
}

type EmptyStateProps = {
  action?: ReactNode;
  body: string;
  title: string;
};

export function EmptyState({ action, body, title }: EmptyStateProps) {
  return (
    <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-border-strong bg-surface p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="leading-normal text-muted">{body}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  body = "Não foi possível carregar esta proposição. Tente novamente.",
  onRetry,
  title = "Erro ao carregar",
}: {
  body?: string;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div className="grid gap-4">
      <InlineMessage
        body={body}
        title={title}
        tone="danger"
      />
      <Button
        className="justify-self-start"
        onClick={onRetry}
        variant="secondary"
      >
        Tentar novamente
      </Button>
    </div>
  );
}

type SourceLinkProps = AnchorHTMLAttributes<HTMLAnchorElement>;

export function SourceLink({ children, className, ...props }: SourceLinkProps) {
  return (
    <a
      className={joinClassNames(
        "inline-flex min-w-0 items-center gap-2 text-sm font-[650] text-info underline decoration-info/35 underline-offset-[0.18em]",
        className,
      )}
      {...props}
    >
      <span className="[overflow-wrap:anywhere]">{children}</span>
      <svg
        aria-hidden="true"
        fill="none"
        height="16"
        viewBox="0 0 16 16"
        width="16"
      >
        <path
          d="M6.25 3.75h6m0 0v6m0-6-7 7M4.75 5.5H3.5a1.5 1.5 0 0 0-1.5 1.5v5.5A1.5 1.5 0 0 0 3.5 14h5.5a1.5 1.5 0 0 0 1.5-1.5v-1.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    </a>
  );
}

type SkeletonRowsProps = {
  count?: number;
};

export function SkeletonRows({ count = 3 }: SkeletonRowsProps) {
  return (
    <div aria-label="Carregando conteúdo" className="grid gap-3" role="status">
      {Array.from({ length: count }, (_, index) => (
        <div className="grid gap-2 border-b border-border py-3" key={index}>
          <SkeletonLine className="w-[68%]" />
          <SkeletonLine className="w-[42%]" />
        </div>
      ))}
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return (
    <span
      className={joinClassNames(
        "h-3 animate-skeleton rounded-full bg-[length:200%_100%] bg-[linear-gradient(90deg,var(--color-surface-muted),var(--color-border),var(--color-surface-muted))]",
        className,
      )}
    />
  );
}
