"use client";

import type { MatcherDeputadoDetalhe } from "@vota-comigo/shared-types";

import { DeputadoAvatar, DeputadoPerfilLink } from "@/shared/deputado";
import { ErrorState, SkeletonRows } from "@/shared/ui";

import type { MatcherStatus } from "../../lib/matcher-state";
import { DetalheMetricas } from "./detalhe-metricas";
import { VotoLista } from "./voto-lista";

type DeputadoDetalheProps = {
  detalhe: MatcherDeputadoDetalhe | null;
  status: MatcherStatus;
  onRetry: () => void;
};

export function DeputadoDetalhe({
  detalhe,
  status,
  onRetry,
}: DeputadoDetalheProps) {
  if (status === "loading") {
    return (
      <SkeletonRows count={6} />
    );
  }

  if (status === "error") {
    return <ErrorState onRetry={onRetry} />;
  }

  if (!detalhe) return null;

  const { deputado, metrics, votos } = detalhe;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <DeputadoAvatar nome={deputado.nome} urlFoto={deputado.urlFoto} />
          <div className="min-w-0">
            <p className="font-[680] text-ink">{deputado.nome ?? "Sem nome"}</p>
            <p className="text-sm text-muted">
              {deputado.partido ?? "—"} · {deputado.siglaUf}
            </p>
          </div>
        </div>
        <DeputadoPerfilLink externalIdDeputado={deputado.externalIdDeputado} />
      </div>

      <DetalheMetricas metrics={metrics} />

      <VotoLista votos={votos} />
    </div>
  );
}
