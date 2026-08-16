"use client";

import type { DeputadoFaixaEtaria } from "@vota-comigo/shared-types";

import { ChipGroup } from "@/shared/ui";

import { FAIXA_ETARIA_OPCOES, toFaixaEtariaLabel } from "./presentation";

type DeputadoFaixaEtariaControlProps = {
  selecionadas: readonly DeputadoFaixaEtaria[];
  onToggle: (faixa: DeputadoFaixaEtaria) => void;
  className?: string;
};

export function DeputadoFaixaEtariaControl({
  selecionadas,
  onToggle,
  className,
}: DeputadoFaixaEtariaControlProps) {
  return (
    <ChipGroup
      className={className}
      label="Filtrar por faixa etária"
      onToggle={onToggle}
      options={FAIXA_ETARIA_OPCOES.map((faixa) => ({
        valor: faixa,
        label: toFaixaEtariaLabel(faixa),
      }))}
      selecionados={selecionadas}
    />
  );
}
