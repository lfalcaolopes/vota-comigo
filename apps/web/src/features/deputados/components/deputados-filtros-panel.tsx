"use client";

import type {
  PartidoDisponivel,
  UfDisponivel,
} from "@vota-comigo/shared-types";
import { useState } from "react";

import {
  contarFiltrosAtivos,
  DeputadoFaixaEtariaControl,
  DeputadoPartidoControl,
  DeputadoSexoControl,
  DeputadoUfControl,
  FILTROS_PADRAO,
  saoFiltrosIguais,
  type DeputadoFeedFiltros,
} from "@/shared/deputado";
import {
  FiltroSecao,
  FiltrosPanel,
  Radio,
  Switch,
  toggleValor,
} from "@/shared/ui";

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
      <FiltroSecao titulo="Ordenação">
        <div
          className="grid gap-3"
          role="radiogroup"
          aria-label="Ordenação dos deputados"
        >
          <Radio
            checked={rascunho.sort === "nome"}
            label="Nome"
            name="deputado-sort"
            onChange={() =>
              setRascunho((atual) => ({ ...atual, sort: "nome" }))
            }
          />
          <div className="grid gap-1">
            <Radio
              checked={rascunho.sort === "menor-uso-cota"}
              label="Menor uso da cota"
              name="deputado-sort"
              onChange={() =>
                setRascunho((atual) => ({ ...atual, sort: "menor-uso-cota" }))
              }
            />
            <p className="pl-7 text-sm leading-normal text-muted">
              Percentual da cota usado no período analisado.
            </p>
          </div>
        </div>
      </FiltroSecao>

      <Switch
        checked={rascunho.incluirForaDeExercicio}
        className="min-h-11 justify-start"
        label="Incluir quem não está em exercício"
        onChange={(event) =>
          setRascunho((atual) => ({
            ...atual,
            incluirForaDeExercicio: event.target.checked,
          }))
        }
      />

      <FiltroSecao titulo="Sexo">
        <DeputadoSexoControl
          onChange={(sexo) => setRascunho((atual) => ({ ...atual, sexo }))}
          sexo={rascunho.sexo}
        />
      </FiltroSecao>

      <FiltroSecao titulo="Idade">
        <DeputadoFaixaEtariaControl
          onToggle={(faixa) =>
            setRascunho((atual) => ({
              ...atual,
              faixasEtarias: toggleValor(atual.faixasEtarias, faixa),
            }))
          }
          selecionadas={rascunho.faixasEtarias}
        />
      </FiltroSecao>

      {ufs.length > 0 ? (
        <FiltroSecao titulo="Estado">
          <DeputadoUfControl
            onToggle={(siglaUf) =>
              setRascunho((atual) => ({
                ...atual,
                ufs: toggleValor(atual.ufs, siglaUf),
              }))
            }
            selecionados={rascunho.ufs}
            ufs={ufs}
          />
        </FiltroSecao>
      ) : null}

      {partidos.length > 0 ? (
        <FiltroSecao titulo="Partido">
          <DeputadoPartidoControl
            onToggle={(siglaPartido) =>
              setRascunho((atual) => ({
                ...atual,
                partidos: toggleValor(atual.partidos, siglaPartido),
              }))
            }
            partidos={partidos}
            selecionados={rascunho.partidos}
          />
        </FiltroSecao>
      ) : null}
    </FiltrosPanel>
  );
}
