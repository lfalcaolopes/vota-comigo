"use client";

import type { MatcherDeputadoDetalhe } from "@vota-comigo/shared-types";

import { DeputadoAvatar, DeputadoPerfilLink } from "@/shared/deputado";
import { ArrowLeftIcon, Button, ErrorState, SkeletonRows } from "@/shared/ui";

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

function VoltarButton({ onBack }: { onBack: () => void }) {
  return (
    <Button className="justify-self-start" onClick={onBack} variant="ghost">
      <ArrowLeftIcon aria-hidden />
      Voltar ao resultado
    </Button>
  );
}

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
        <VoltarButton onBack={onBack} />
        <SkeletonRows count={6} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="grid gap-5">
        <VoltarButton onBack={onBack} />
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
      <VoltarButton onBack={onBack} />

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
