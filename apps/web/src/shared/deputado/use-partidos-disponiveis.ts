"use client";

import type { PartidoDisponivel } from "@vota-comigo/shared-types";
import { useEffect, useState } from "react";

import { partidosDisponiveis } from "./queries";

// As siglas dependem do recorte territorial: no escopo estadual, oferecer um
// partido sem deputado no estado devolveria lista vazia ao usuário.
export function usePartidosDisponiveis(
  siglaUf: string | undefined,
): readonly PartidoDisponivel[] {
  const [partidos, setPartidos] = useState<readonly PartidoDisponivel[]>([]);

  useEffect(() => {
    // Sem guard por requisição já feita: um guard que sobrevive ao remonte do
    // StrictMode impediria o refetch depois que a limpeza descartou a resposta.
    let cancelado = false;
    void partidosDisponiveis(siglaUf)
      .then(({ items }) => {
        if (!cancelado) setPartidos(items);
      })
      .catch(() => {
        if (!cancelado) setPartidos([]);
      });

    return () => {
      cancelado = true;
    };
  }, [siglaUf]);

  return partidos;
}
