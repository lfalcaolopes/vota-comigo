"use client";

import type { TemaDisponivel } from "@vota-comigo/shared-types";

import { Chip } from "@/shared/ui";

type FeedTemaControlProps = {
  temas: readonly TemaDisponivel[];
  activeTema: number | null;
  onSelect: (tema: number) => void;
};

export function FeedTemaControl({
  temas,
  activeTema,
  onSelect,
}: FeedTemaControlProps) {
  if (temas.length === 0) return null;

  return (
    <div
      aria-label="Filtrar por tema"
      className="flex flex-wrap gap-2"
      role="group"
    >
      {temas.map((t) => (
        <Chip
          key={t.externalCodTema}
          onClick={() => onSelect(t.externalCodTema)}
          selected={activeTema === t.externalCodTema}
        >
          {t.tema}
        </Chip>
      ))}
    </div>
  );
}
