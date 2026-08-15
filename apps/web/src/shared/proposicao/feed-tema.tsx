"use client";

import type { TemaDisponivel } from "@vota-comigo/shared-types";

import { Chip } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

type FeedTemaControlProps = {
  temas: readonly TemaDisponivel[];
  activeTema: number | null;
  onChange: (tema: number | null) => void;
  className?: string;
};

export function FeedTemaControl({
  temas,
  activeTema,
  onChange,
  className,
}: FeedTemaControlProps) {
  if (temas.length === 0) return null;

  return (
    <div
      aria-label="Filtrar por tema"
      className={joinClassNames("flex flex-wrap gap-2", className)}
      role="group"
    >
      {temas.map((tema) => {
        const selected = activeTema === tema.externalCodTema;

        return (
          <Chip
            key={tema.externalCodTema}
            onClick={() => onChange(selected ? null : tema.externalCodTema)}
            selected={selected}
          >
            {tema.tema}
          </Chip>
        );
      })}
    </div>
  );
}
