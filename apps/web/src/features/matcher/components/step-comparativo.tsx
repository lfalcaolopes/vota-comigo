"use client";

import type { MatcherDeputadoResumo } from "@vota-comigo/shared-types";

import { Button } from "@/shared/ui";

import { DeputadoAvatar } from "./deputado-avatar";

type StepComparativoProps = {
  deputados: MatcherDeputadoResumo[];
  onBack: () => void;
};

export function StepComparativo({ deputados, onBack }: StepComparativoProps) {
  return (
    <div className="grid gap-5">
      <div>
        <Button onClick={onBack} variant="secondary">
          Voltar ao resultado
        </Button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {deputados.map((deputado) => (
          <li
            className="flex items-center gap-3 rounded-md border border-border bg-white p-3"
            key={deputado.externalIdDeputado}
          >
            <DeputadoAvatar nome={deputado.nome} urlFoto={deputado.urlFoto} />
            <div className="min-w-0">
              <p className="font-[650] text-ink">{deputado.nome ?? "Sem nome"}</p>
              <p className="text-sm text-muted">
                {deputado.partido ?? "—"} · {deputado.siglaUf}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
