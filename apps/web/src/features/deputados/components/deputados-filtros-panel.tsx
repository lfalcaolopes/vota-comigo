"use client";

import type {
  PartidoDisponivel,
  UfDisponivel,
} from "@vota-comigo/shared-types";
import { useState } from "react";

import {
  contarFiltrosAtivos,
  DeputadoPartidoControl,
  DeputadoUfControl,
  FILTROS_PADRAO,
  saoFiltrosIguais,
  type DeputadoFeedFiltros,
} from "@/shared/deputado";
import { FiltroSecao, FiltrosPanel, Switch } from "@/shared/ui";

type DeputadosFiltrosPanelProps = {
  filtros: DeputadoFeedFiltros;
  onApply: (filtros: DeputadoFeedFiltros) => void;
  ufs: readonly UfDisponivel[];
  partidos: readonly PartidoDisponivel[];
};

export function DeputadosFiltrosPanel({
  filtros,
  onApply,
  ufs,
  partidos,
}: DeputadosFiltrosPanelProps) {
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
      total={contarFiltrosAtivos(filtros)}
    >
      <Switch
        checked={rascunho.emAtividade}
        className="min-h-11 justify-start"
        label="Em atividade"
        onChange={(event) =>
          setRascunho((atual) => ({
            ...atual,
            emAtividade: event.target.checked,
          }))
        }
      />

      {ufs.length > 0 ? (
        <FiltroSecao titulo="Estado">
          <DeputadoUfControl
            activeUf={rascunho.uf}
            onChange={(uf) => setRascunho((atual) => ({ ...atual, uf }))}
            ufs={ufs}
          />
        </FiltroSecao>
      ) : null}

      {partidos.length > 0 ? (
        <FiltroSecao titulo="Partido">
          <DeputadoPartidoControl
            activePartido={rascunho.partido}
            onChange={(partido) =>
              setRascunho((atual) => ({ ...atual, partido }))
            }
            partidos={partidos}
          />
        </FiltroSecao>
      ) : null}
    </FiltrosPanel>
  );
}
