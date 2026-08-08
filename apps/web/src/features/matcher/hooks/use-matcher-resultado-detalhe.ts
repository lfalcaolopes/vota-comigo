"use client";

import type { MatcherDeputadoDetalhe } from "@vota-comigo/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { getDeputadoDetalhe } from "@/shared/matcher";

import { buildExecucaoRequest } from "../lib/matcher-payload";
import { canRunMatcher, type MatcherStatus } from "../lib/matcher-state";
import { useMatcher } from "../components/matcher-provider";

export function useMatcherResultadoDetalhe(externalIdDeputado: number) {
  const { state } = useMatcher();
  const [detalhe, setDetalhe] = useState<MatcherDeputadoDetalhe | null>(null);
  const [status, setStatus] = useState<MatcherStatus>("loading");
  const requestedIdRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (state.siglaUf === null || !canRunMatcher(state)) return;

    setStatus("loading");
    setDetalhe(null);

    try {
      const request = buildExecucaoRequest({
        siglaUf: state.siglaUf,
        escopo: state.escopo,
        cidade: state.cidade,
        posicoes: state.posicoes,
        apenasEmAtividade: state.apenasEmAtividade,
      });
      const nextDetalhe = await getDeputadoDetalhe(externalIdDeputado, request);
      setDetalhe(nextDetalhe);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [externalIdDeputado, state]);

  useEffect(() => {
    if (requestedIdRef.current === externalIdDeputado) return;
    requestedIdRef.current = externalIdDeputado;
    void load();
  }, [externalIdDeputado, load]);

  return { detalhe, retry: load, status };
}
