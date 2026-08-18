"use client";

import type { TemaDisponivel } from "@vota-comigo/shared-types";
import { useState } from "react";

import { FiltroSecao, FiltrosPanel } from "@/shared/ui";

import { FeedOrdenacaoControl } from "./feed-ordenacao";
import {
  contarFiltrosAtivos,
  FILTROS_PADRAO,
  saoFiltrosIguais,
  type ProposicaoFeedFiltros,
} from "./feed-filtros";
import { FeedTemaControl } from "./feed-tema";

type ProposicaoFiltrosPanelProps = {
  filtros: ProposicaoFeedFiltros;
  onApply: (filtros: ProposicaoFeedFiltros) => void;
  temas: readonly TemaDisponivel[];
};

export function ProposicaoFiltrosPanel({
  filtros,
  onApply,
  temas,
}: ProposicaoFiltrosPanelProps) {
  // O rascunho nasce do que está aplicado a cada abertura; painel fechado não
  // guarda estado.
  const [rascunho, setRascunho] = useState(filtros);

  return (
    <FiltrosPanel
      isApplyDisabled={saoFiltrosIguais(rascunho, filtros)}
      isLimparDisabled={saoFiltrosIguais(rascunho, FILTROS_PADRAO)}
      onApply={() => onApply(rascunho)}
      onLimpar={() => setRascunho(FILTROS_PADRAO)}
      onOpen={() => setRascunho(filtros)}
      total={contarFiltrosAtivos(filtros, temas)}
    >
      <FiltroSecao titulo="Ordenação">
        <FeedOrdenacaoControl
          className="w-full"
          itemClassName="flex-1"
          onChange={(ordenacao) =>
            setRascunho((atual) => ({ ...atual, ordenacao }))
          }
          value={rascunho.ordenacao}
        />
      </FiltroSecao>

      {temas.length > 0 ? (
        <FiltroSecao titulo="Tema">
          <FeedTemaControl
            activeTema={rascunho.tema}
            onChange={(tema) => setRascunho((atual) => ({ ...atual, tema }))}
            temas={temas}
          />
        </FiltroSecao>
      ) : null}
    </FiltrosPanel>
  );
}
