"use client";

import type {
  MatcherDeputadoResumo,
  MatcherResultado,
} from "@vota-comigo/shared-types";

import { Button, ErrorState, SkeletonRows } from "@/shared/ui";

import type { MatcherStatus } from "../lib/matcher-state";

type StepResultadoProps = {
  status: MatcherStatus;
  resultado: MatcherResultado | null;
  onBack: () => void;
  onRetry: () => void;
};

export function StepResultado({
  status,
  resultado,
  onBack,
  onRetry,
}: StepResultadoProps) {
  if (status === "loading") {
    return <SkeletonRows count={5} />;
  }

  if (status === "error") {
    return <ErrorState onRetry={onRetry} />;
  }

  if (!resultado || resultado.deputados.length === 0) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted">
          Nenhum deputado comparável para as proposições escolhidas.
        </p>
        <Button className="justify-self-start" onClick={onBack}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <p className="text-sm leading-normal text-muted">
        Cobertura limitada a deputados federais com histórico de votação. O
        percentual vem sempre colado à amostra comparável.
      </p>

      <ul className="grid gap-2">
        {resultado.deputados.map((deputado) => (
          <DeputadoRow
            deputado={deputado}
            key={deputado.externalIdDeputado}
          />
        ))}
      </ul>

      <Button className="justify-self-start" onClick={onBack}>
        Voltar
      </Button>
    </div>
  );
}

function DeputadoRow({ deputado }: { deputado: MatcherDeputadoResumo }) {
  const compatibilidade = Math.round(deputado.compatibilidadeBruta);

  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-border py-3">
      <span className="font-[650] text-ink">
        {deputado.nome ?? "Sem nome"}
        <span className="ml-2 text-sm font-normal text-muted">
          {deputado.partido ?? "—"} · {deputado.siglaUf}
        </span>
      </span>
      <span className="text-sm font-[650] text-ink">
        {compatibilidade}% ·{" "}
        <span className="font-normal text-muted">
          {deputado.amostraComparavel} comparada(s)
        </span>
      </span>
    </li>
  );
}
