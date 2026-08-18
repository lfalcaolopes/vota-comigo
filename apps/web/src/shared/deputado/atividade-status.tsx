import { toAtividadeAriaLabel, toAtividadeLabel } from "./presentation";

export function AtividadeStatus({
  className = "",
  emAtividade,
}: {
  className?: string;
  emAtividade: boolean;
}) {
  return (
    <span
      aria-label={toAtividadeAriaLabel(emAtividade)}
      className={`inline-flex max-w-full items-center gap-1.5 text-xs font-[560] leading-normal text-muted [overflow-wrap:anywhere] ${className}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${
          emAtividade ? "bg-success ring-1 ring-success/35" : "bg-subtle"
        }`}
      />
      {toAtividadeLabel(emAtividade)}
    </span>
  );
}
