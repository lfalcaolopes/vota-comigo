"use client";

import type { ProposicaoDetalhe } from "@vota-comigo/shared-types";
import { useEffect, useState } from "react";

import { detalhe as fetchDetalhe } from "@/shared/proposicao";

type Status = "loading" | "error" | "ready";

type UseProposicaoDetalhe = {
  detalhe: ProposicaoDetalhe | null;
  status: Status;
  retry: () => void;
};

const cache = new Map<number, ProposicaoDetalhe>();
const failed = new Set<number>();

export function useProposicaoDetalhe(
  externalIdProposicao: number,
): UseProposicaoDetalhe {
  const [, setTick] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const detalhe = cache.get(externalIdProposicao) ?? null;
  const status: Status = detalhe
    ? "ready"
    : failed.has(externalIdProposicao)
      ? "error"
      : "loading";

  useEffect(() => {
    if (cache.has(externalIdProposicao) || failed.has(externalIdProposicao)) {
      return;
    }

    let active = true;
    fetchDetalhe(externalIdProposicao)
      .then((data) => {
        cache.set(externalIdProposicao, data);
        if (active) setTick((value) => value + 1);
      })
      .catch(() => {
        failed.add(externalIdProposicao);
        if (active) setTick((value) => value + 1);
      });

    return () => {
      active = false;
    };
  }, [externalIdProposicao, attempt]);

  function retry() {
    failed.delete(externalIdProposicao);
    setAttempt((value) => value + 1);
  }

  return { detalhe, status, retry };
}
