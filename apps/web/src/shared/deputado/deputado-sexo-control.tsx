"use client";

import type { DeputadoSexo } from "@vota-comigo/shared-types";

import { ChipGroup } from "@/shared/ui";

import { SEXO_OPCOES, toSexoLabel } from "./presentation";

type DeputadoSexoControlProps = {
  sexo: DeputadoSexo | null;
  onChange: (sexo: DeputadoSexo | null) => void;
  className?: string;
};

export function DeputadoSexoControl({
  sexo,
  onChange,
  className,
}: DeputadoSexoControlProps) {
  return (
    <ChipGroup
      className={className}
      label="Filtrar por sexo"
      // Marcar os dois não filtra nada, então a escolha é única e clicar no
      // selecionado desmarca.
      onToggle={(valor) => onChange(sexo === valor ? null : valor)}
      options={SEXO_OPCOES.map((opcao) => ({
        valor: opcao,
        label: toSexoLabel(opcao),
      }))}
      selecionados={sexo === null ? [] : [sexo]}
    />
  );
}
