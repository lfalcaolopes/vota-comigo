"use client";

import type { PartidoDisponivel } from "@vota-comigo/shared-types";

import { Chip } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

type DeputadoPartidoControlProps = {
  partidos: readonly PartidoDisponivel[];
  activePartido: string | null;
  onChange: (partido: string | null) => void;
  className?: string;
};

export function DeputadoPartidoControl({
  partidos,
  activePartido,
  onChange,
  className,
}: DeputadoPartidoControlProps) {
  if (partidos.length === 0) return null;

  return (
    <div
      aria-label="Filtrar por partido"
      className={joinClassNames("flex flex-wrap gap-2", className)}
      role="group"
    >
      {partidos.map((partido) => {
        const selected = activePartido === partido.siglaPartido;

        return (
          <Chip
            key={partido.siglaPartido}
            onClick={() => onChange(selected ? null : partido.siglaPartido)}
            selected={selected}
          >
            {partido.siglaPartido}
          </Chip>
        );
      })}
    </div>
  );
}
