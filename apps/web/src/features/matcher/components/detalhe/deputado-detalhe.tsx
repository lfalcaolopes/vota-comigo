"use client";

import type { MatcherDeputadoDetalhe } from "@vota-comigo/shared-types";

import { DeputadoAvatar, DeputadoPerfilLink } from "@/shared/deputado";
import { Button, ErrorState, SkeletonRows } from "@/shared/ui";

import type { MatcherStatus } from "../../lib/matcher-state";
import { DetalheMetricas } from "./detalhe-metricas";
import { VotoLista } from "./voto-lista";

type DeputadoDetalheProps = {
  detalhe: MatcherDeputadoDetalhe | null;
  detalheDeputadoId: number | null;
  status: MatcherStatus;
  onBack: () => void;
  onRetry: (externalIdDeputado: number) => void;
};

export function DeputadoDetalhe({
  detalhe,
  detalheDeputadoId,
  status,
  onBack,
  onRetry,
}: DeputadoDetalheProps) {
  if (status === "loading") {
    return (
      <div className="grid gap-5">
        <Button
          className="justify-self-start"
          onClick={onBack}
          variant="secondary"
        >
          Voltar ao resultado
        </Button>
        <SkeletonRows count={6} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="grid gap-5">
        <Button
          className="justify-self-start"
          onClick={onBack}
          variant="secondary"
        >
          Voltar ao resultado
        </Button>
        <ErrorState
          onRetry={() => {
            if (detalheDeputadoId !== null) onRetry(detalheDeputadoId);
          }}
        />
      </div>
    );
  }

  if (!detalhe) return null;

  const { deputado, metrics, votos } = detalhe;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <Button onClick={onBack} variant="secondary">
          Voltar ao resultado
        </Button>
        <DeputadoPerfilLink externalIdDeputado={deputado.externalIdDeputado} />
      </div>

      <div className="flex items-center gap-3">
        <DeputadoAvatar nome={deputado.nome} urlFoto={deputado.urlFoto} />
        <div className="min-w-0">
          <p className="font-[680] text-ink">{deputado.nome ?? "Sem nome"}</p>
          <p className="text-sm text-muted">
            {deputado.partido ?? "—"} · {deputado.siglaUf}
          </p>
        </div>
      </div>

      <DetalheMetricas metrics={metrics} />

      <VotoLista votos={votos} />
    </div>
  );
}
