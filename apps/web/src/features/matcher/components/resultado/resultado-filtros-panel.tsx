"use client";

import type {
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";
import { useState } from "react";

import { ProposicoesSelecionadasList } from "@/shared/proposicao";
import { Checkbox, FiltroSecao, FiltrosPanel, Switch } from "@/shared/ui";

import {
  contarResultadoFiltrosAtivos,
  RESULTADO_FILTROS_PADRAO,
  saoResultadoFiltrosIguais,
  toggleResultadoFiltroConcordancia,
  type ResultadoFiltros,
} from "../../lib/resultado-filtros";

type ResultadoFiltrosPanelProps = {
  filtros: ResultadoFiltros;
  onApply: (filtros: ResultadoFiltros) => void;
  posicoes: ReadonlyMap<number, PosicaoUsuarioMatcher>;
  proposicoesElegiveis: readonly ProposicaoCard[];
};

export function ResultadoFiltrosPanel({
  filtros,
  onApply,
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
      <Switch
        checked={rascunho.apenasEmAtividade}
        className="min-h-11 justify-start"
        label="Apenas em atividade"
        onChange={(event) =>
          setRascunho((atual) => ({
            ...atual,
            apenasEmAtividade: event.target.checked,
          }))
        }
      />

      <FiltroSecao titulo="Exigir concordância">
        {proposicoesElegiveis.length === 0 ? (
          <p className="text-sm leading-normal text-muted">
            Marque aprovar ou rejeitar em ao menos uma proposição para exigir
            concordância. Proposições respondidas com &quot;não sei&quot; não
            entram nesse filtro.
          </p>
        ) : (
          <>
            <p className="text-sm leading-normal text-muted">
              Marque as proposições em que o deputado precisa ter votado de
              acordo com você.
            </p>
            <ProposicoesSelecionadasList
              ariaLabel="Proposições do filtro de concordância"
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
