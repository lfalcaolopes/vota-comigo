"use client";

import type { UfDisponivel } from "@vota-comigo/shared-types";

import { ChipGroup } from "@/shared/ui";

import { toEstadoLabel } from "./presentation";

type DeputadoUfControlProps = {
  ufs: readonly UfDisponivel[];
  selecionados: readonly string[];
  onToggle: (siglaUf: string) => void;
  className?: string;
};

export function DeputadoUfControl({
  ufs,
  selecionados,
  onToggle,
  className,
}: DeputadoUfControlProps) {
  return (
    <ChipGroup
      className={className}
      label="Filtrar por estado"
      onToggle={onToggle}
      options={ufs.map((uf) => ({
        valor: uf.siglaUf,
        label: toEstadoLabel(uf.siglaUf),
      }))}
      selecionados={selecionados}
    />
  );
}
