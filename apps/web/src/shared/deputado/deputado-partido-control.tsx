"use client";

import type { PartidoDisponivel } from "@vota-comigo/shared-types";

import { ChipGroup } from "@/shared/ui";

type DeputadoPartidoControlProps = {
  partidos: readonly PartidoDisponivel[];
  selecionados: readonly string[];
  onToggle: (siglaPartido: string) => void;
  className?: string;
};

export function DeputadoPartidoControl({
  partidos,
  selecionados,
  onToggle,
  className,
}: DeputadoPartidoControlProps) {
  return (
    <ChipGroup
      className={className}
      label="Filtrar por partido"
      onToggle={onToggle}
      options={partidos.map((partido) => ({
        valor: partido.siglaPartido,
        label: partido.siglaPartido,
      }))}
      selecionados={selecionados}
    />
  );
}
