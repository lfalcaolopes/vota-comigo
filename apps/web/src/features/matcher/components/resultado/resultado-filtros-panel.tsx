"use client";

import type {
  PartidoDisponivel,
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { useState } from "react";

import { DeputadoPartidoControl, DeputadoSexoControl } from "@/shared/deputado";
import { ProposicoesSelecionadasList } from "@/shared/proposicao";
import {
  Checkbox,
  FiltroSecao,
  FiltrosPanel,
  Radio,
  Switch,
  toggleValor,
} from "@/shared/ui";

import {
  contarResultadoFiltrosAtivos,
  RESULTADO_FILTRO_NOME,
  RESULTADO_FILTROS_PADRAO,
  saoResultadoFiltrosIguais,
  toggleResultadoFiltroConcordancia,
  type ResultadoFiltros,
} from "../../lib/resultado-filtros";

type ResultadoFiltrosPanelProps = {
  filtros: ResultadoFiltros;
  onApply: (filtros: ResultadoFiltros) => void;
  partidos: readonly PartidoDisponivel[];
  posicoes: ReadonlyMap<number, PosicaoUsuarioMatcher>;
  proposicoesElegiveis: readonly ProposicaoCard[];
};

export function ResultadoFiltrosPanel({
  filtros,
  onApply,
  partidos,
  posicoes,
  proposicoesElegiveis,
}: ResultadoFiltrosPanelProps) {
  // O rascunho nasce do que está aplicado a cada abertura; painel fechado não
  // guarda estado.
  const [rascunho, setRascunho] = useState(filtros);

  return (
    <FiltrosPanel
      align="start"
      isApplyDisabled={saoResultadoFiltrosIguais(rascunho, filtros)}
      isLimparDisabled={saoResultadoFiltrosIguais(
        rascunho,
        RESULTADO_FILTROS_PADRAO,
      )}
      onApply={() => onApply(rascunho)}
      onLimpar={() => setRascunho(RESULTADO_FILTROS_PADRAO)}
      onOpen={() => setRascunho(filtros)}
      total={contarResultadoFiltrosAtivos(filtros)}
    >
      <FiltroSecao titulo="Ordenação">
        <div
          className="grid gap-3"
          role="radiogroup"
          aria-label="Ordenação dos resultados"
        >
          <Radio
            checked={rascunho.sort === "compatibilidade"}
            label="Compatibilidade"
            name="matcher-sort"
            onChange={() =>
              setRascunho((atual) => ({ ...atual, sort: "compatibilidade" }))
            }
          />
          <div className="grid gap-1">
            <Radio
              checked={rascunho.sort === "menor-uso-cota"}
              label="Menor uso da cota"
              name="matcher-sort"
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
        checked={rascunho.apenasEmAtividade}
        className="min-h-11 justify-start"
        label={RESULTADO_FILTRO_NOME.apenasEmAtividade}
        onChange={(event) =>
          setRascunho((atual) => ({
            ...atual,
            apenasEmAtividade: event.target.checked,
          }))
        }
      />

      <Switch
        checked={rascunho.ocultarAmostraPequena}
        className="min-h-11 justify-start"
        label={RESULTADO_FILTRO_NOME.ocultarAmostraPequena}
        onChange={(event) =>
          setRascunho((atual) => ({
            ...atual,
            ocultarAmostraPequena: event.target.checked,
          }))
        }
      />

      {partidos.length > 0 ? (
        <FiltroSecao titulo={RESULTADO_FILTRO_NOME.partidos}>
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

      <FiltroSecao titulo={RESULTADO_FILTRO_NOME.sexo}>
        <DeputadoSexoControl
          onChange={(sexo) => setRascunho((atual) => ({ ...atual, sexo }))}
          sexo={rascunho.sexo}
        />
      </FiltroSecao>

      <FiltroSecao titulo="Exigir concordância">
        {proposicoesElegiveis.length === 0 ? (
          <p className="text-sm leading-normal text-muted">
            Marque aprovar ou rejeitar em ao menos uma proposta para exigir
            concordância. Propostas respondidas com &quot;não sei&quot; não
            entram nesse filtro.
          </p>
        ) : (
          <>
            <p className="text-sm leading-normal text-muted">
              Marque as propostas em que o deputado precisa ter votado de acordo
              com você.
            </p>
            <ProposicoesSelecionadasList
              ariaLabel="Propostas do filtro de concordância"
              posicoes={posicoes}
              proposicoes={proposicoesElegiveis}
              renderAction={(proposicao, _index, identificador) => (
                <Checkbox
                  checked={rascunho.externalIdProposicoesFiltroConcordancia.includes(
                    proposicao.externalIdProposicao,
                  )}
                  className="size-11 justify-center"
                  hideLabel
                  label={`Exigir concordância em ${identificador}`}
                  onChange={() =>
                    setRascunho((atual) =>
                      toggleResultadoFiltroConcordancia(
                        atual,
                        proposicao.externalIdProposicao,
                      ),
                    )
                  }
                />
              )}
            />
          </>
        )}
      </FiltroSecao>
    </FiltrosPanel>
  );
}
