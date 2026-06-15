"use client";

import type { MatcherVotoDetalhe } from "@vota-comigo/shared-types";
import { useState } from "react";

import { Chip } from "@/shared/ui";

import {
  FORA_DO_DENOMINADOR_EXPLICACAO,
  VOTO_FILTROS,
  countVotosByFiltro,
  filterVotos,
  sortVotosByVotacaoDataDesc,
  toFiltroLabel,
  type VotoFiltro,
} from "../lib/matcher-detalhe-presentation";
import { VotoDetalheItem } from "./voto-detalhe-item";

type VotoListaProps = {
  votos: MatcherVotoDetalhe[];
};

export function VotoLista({ votos }: VotoListaProps) {
  const [filtro, setFiltro] = useState<VotoFiltro>("todos");

  if (votos.length === 0) return null;

  const counts = countVotosByFiltro(votos);
  const visiveis = sortVotosByVotacaoDataDesc(filterVotos(votos, filtro));
  const mostraExplicacao = filtro === "fora" && visiveis.length > 0;

  return (
    <section aria-label="Proposições avaliadas" className="grid gap-3">
      <div
        aria-label="Filtrar proposições por resultado"
        className="flex flex-wrap gap-2"
        role="group"
      >
        {VOTO_FILTROS.map((opcao) => (
          <Chip
            disabled={opcao !== "todos" && counts[opcao] === 0}
            key={opcao}
            onClick={() => setFiltro(opcao)}
            selected={filtro === opcao}
          >
            {toFiltroLabel(opcao)}
            <span className="ml-1.5 font-normal tabular-nums text-muted">
              {counts[opcao]}
            </span>
          </Chip>
        ))}
      </div>

      {mostraExplicacao ? (
        <p className="text-sm leading-normal text-muted">
          {FORA_DO_DENOMINADOR_EXPLICACAO}
        </p>
      ) : null}

      {visiveis.length > 0 ? (
        <ul className="grid">
          {visiveis.map((voto) => (
            <li key={voto.votacaoReferencia.externalIdVotacao}>
              <VotoDetalheItem voto={voto} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-3 text-sm text-muted">
          Nenhuma proposição neste filtro.
        </p>
      )}
    </section>
  );
}
