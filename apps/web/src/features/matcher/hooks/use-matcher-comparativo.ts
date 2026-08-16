"use client";

import type {
  DeputadoPerfil,
  MatcherDeputadoDetalhe,
} from "@vota-comigo/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { perfil as getDeputadoPerfil } from "@/shared/deputado";
import { getDeputadoDetalhe } from "@/shared/matcher";

import { useMatcher } from "../components/matcher-provider";
import { loadComparativoDeputadosData } from "../lib/comparativo-deputados-detalhes";
import { buildExecucaoRequest } from "../lib/matcher-payload";
import { canRunMatcher, type MatcherStatus } from "../lib/matcher-state";
import { toResultadoFiltros } from "../lib/resultado-filtros";

export function useMatcherComparativo(externalIdsDeputado: number[] | null) {
  const { state } = useMatcher();
  const [detalhes, setDetalhes] = useState<MatcherDeputadoDetalhe[]>([]);
  const [perfis, setPerfis] = useState<DeputadoPerfil[]>([]);
  const [status, setStatus] = useState<MatcherStatus>("loading");
  const requestedIdsRef = useRef<string | null>(null);
  const idsKey = externalIdsDeputado?.join(",") ?? null;

  const load = useCallback(async () => {
    if (
      externalIdsDeputado === null ||
      state.siglaUf === null ||
      !canRunMatcher(state)
    ) {
      return;
    }

    setStatus("loading");
    setDetalhes([]);
    setPerfis([]);

    try {
      const request = buildExecucaoRequest({
        siglaUf: state.siglaUf,
        escopo: state.escopo,
        posicoes: state.posicoes,
        ...toResultadoFiltros(state),
      });
      const data = await loadComparativoDeputadosData({
        externalIdsDeputado,
        request,
        getDeputadoDetalhe,
        getDeputadoPerfil,
      });
      setDetalhes(data.detalhes);
      setPerfis(data.perfis);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [externalIdsDeputado, state]);

  useEffect(() => {
    if (idsKey === null || requestedIdsRef.current === idsKey) return;
    requestedIdsRef.current = idsKey;
    void load();
  }, [idsKey, load]);

  return { detalhes, perfis, retry: load, status };
}
