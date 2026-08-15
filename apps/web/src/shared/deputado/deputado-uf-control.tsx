"use client";

import type { UfDisponivel } from "@vota-comigo/shared-types";

import { Chip } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

import { toEstadoLabel } from "./presentation";

type DeputadoUfControlProps = {
  ufs: readonly UfDisponivel[];
  activeUf: string | null;
  onChange: (uf: string | null) => void;
  className?: string;
};

export function DeputadoUfControl({
  ufs,
  activeUf,
  onChange,
  className,
}: DeputadoUfControlProps) {
  if (ufs.length === 0) return null;

  return (
    <div
      aria-label="Filtrar por estado"
      className={joinClassNames("flex flex-wrap gap-2", className)}
      role="group"
    >
      {ufs.map((uf) => {
        const selected = activeUf === uf.siglaUf;

        return (
          <Chip
            key={uf.siglaUf}
            onClick={() => onChange(selected ? null : uf.siglaUf)}
            selected={selected}
          >
            {toEstadoLabel(uf.siglaUf)}
          </Chip>
        );
      })}
    </div>
  );
}
