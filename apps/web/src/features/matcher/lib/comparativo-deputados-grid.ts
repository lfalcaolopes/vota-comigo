import type {
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  MatcherEffect,
  MatcherVotoDetalhe,
  PosicaoMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";

import {
  toMatcherEffectVerdict,
  toPosicaoLabel,
  toSituacaoLabel,
  type MatcherVerdict,
} from "./matcher-detalhe-presentation";

export type ComparativoDeputadosCell = {
  externalIdDeputado: number;
  situacaoDeputadoVotacao: MatcherVotoDetalhe["situacaoDeputadoVotacao"];
  matcherEffect: MatcherEffect;
  situacaoLabel: string;
  matcherEffectVerdict: MatcherVerdict;
};

export type ComparativoDeputadosColumn = {
  deputado: MatcherDeputadoResumo;
};

export type ComparativoDeputadosRow = {
  proposicao: ProposicaoCard;
  posicaoUsuario: MatcherVotoDetalhe["posicaoUsuario"];
  posicaoUsuarioLabel: string;
  votacaoReferencia: MatcherVotoDetalhe["votacaoReferencia"];
  cells: ComparativoDeputadosCell[];
};

export type ComparativoDeputadosGrid = {
  columns: ComparativoDeputadosColumn[];
  rows: ComparativoDeputadosRow[];
};

type BuildComparativoDeputadosGridInput = {
  selectedDeputados: MatcherDeputadoResumo[];
  detalhes: MatcherDeputadoDetalhe[];
  posicoes: PosicaoMatcher[];
};

export function buildComparativoDeputadosGrid({
  selectedDeputados,
  detalhes,
  posicoes,
}: BuildComparativoDeputadosGridInput): ComparativoDeputadosGrid {
  const detalhesByDeputado = new Map(
    detalhes.map((detalhe) => [detalhe.deputado.externalIdDeputado, detalhe]),
  );

  const orderedDetalhes = selectedDeputados
    .map((deputado) => detalhesByDeputado.get(deputado.externalIdDeputado))
    .filter(
      (detalhe): detalhe is MatcherDeputadoDetalhe => detalhe !== undefined,
    );

  return {
    columns: selectedDeputados.map((deputado) => ({ deputado })),
    rows: posicoes
      .filter((posicao) => posicao.posicao !== "nao_sei")
      .map((posicao) => buildRow(posicao, orderedDetalhes))
      .filter((row): row is ComparativoDeputadosRow => row !== null),
  };
}

function buildRow(
  posicao: PosicaoMatcher,
  detalhes: MatcherDeputadoDetalhe[],
): ComparativoDeputadosRow | null {
  const cellVotos = detalhes
    .map((detalhe) => {
      const voto = detalhe.votos.find(
        (voto) =>
          voto.proposicao.externalIdProposicao === posicao.externalIdProposicao,
      );

      return voto ? { detalhe, voto } : null;
    })
    .filter(
      (
        item,
      ): item is {
        detalhe: MatcherDeputadoDetalhe;
        voto: MatcherVotoDetalhe;
      } => item !== null,
    );

  const firstVoto = cellVotos[0]?.voto;
  if (!firstVoto || posicao.posicao === "nao_sei") return null;

  return {
    proposicao: firstVoto.proposicao,
    posicaoUsuario: posicao.posicao,
    posicaoUsuarioLabel: toPosicaoLabel(posicao.posicao),
    votacaoReferencia: firstVoto.votacaoReferencia,
    cells: cellVotos.map(({ detalhe, voto }) => ({
      externalIdDeputado: detalhe.deputado.externalIdDeputado,
      situacaoDeputadoVotacao: voto.situacaoDeputadoVotacao,
      matcherEffect: voto.matcherEffect,
      situacaoLabel: toSituacaoLabel(voto.situacaoDeputadoVotacao),
      matcherEffectVerdict: toMatcherEffectVerdict(voto.matcherEffect),
    })),
  };
}
