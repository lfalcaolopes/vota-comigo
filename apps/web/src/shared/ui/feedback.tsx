import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from "react";
import { joinClassNames } from "./utils";

type PanelProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    title?: string;
  }
>;

export function Panel({ children, className, title, ...props }: PanelProps) {
  return (
    <section className={joinClassNames("vc-panel", className)} {...props}>
      {title ? (
        <div className="vc-panel__header">
          <h2 className="vc-panel__title">{title}</h2>
        </div>
      ) : null}
      <div className="vc-panel__body">{children}</div>
    </section>
  );
}

type InlineMessageProps = {
  body: string;
  title: string;
  tone?: "neutral" | "danger";
};

export function InlineMessage({
  body,
  title,
  tone = "neutral",
}: InlineMessageProps) {
  return (
    <div
      className={joinClassNames(
        "vc-message",
        tone === "danger" && "vc-message--danger",
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      <p className="vc-message__title">{title}</p>
      <p className="vc-message__body">{body}</p>
    </div>
  );
}

type EmptyStateProps = {
  action?: ReactNode;
  body: string;
  title: string;
};

export function EmptyState({ action, body, title }: EmptyStateProps) {
  return (
    <div className="vc-empty">
      <h2 className="vc-empty__title">{title}</h2>
      <p className="vc-empty__body">{body}</p>
      {action}
    </div>
  );
}

type SourceLinkProps = AnchorHTMLAttributes<HTMLAnchorElement>;

export function SourceLink({ children, className, ...props }: SourceLinkProps) {
  return (
    <a className={joinClassNames("vc-source-link", className)} {...props}>
      <span>{children}</span>
      <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
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
    <div aria-label="Carregando conteúdo" className="vc-skeleton" role="status">
      {Array.from({ length: count }, (_, index) => (
        <div className="vc-skeleton__row" key={index}>
          <span className="vc-skeleton__line vc-skeleton__line--medium" />
          <span className="vc-skeleton__line vc-skeleton__line--short" />
        </div>
      ))}
    </div>
  );
}
