import type {
  AlertaMatcher,
  DeputadoVotacaoClassification,
  MatcherEffect,
} from '@vota-comigo/shared-types';

import { classifyDeputadoVotacao } from '@/exercicio/rules/deputado-votacao';
import { isEmAtividade } from '@/exercicio/rules/intervalos-exercicio';

import type {
  DeputadoCompatibilidadeInput,
  DeputadoDetalheComputado,
  PosicaoComputavel,
} from '../types/compatibilidade.types';
import {
  FORA_DE_EXERCICIO,
  FORA_DO_DENOMINADOR,
  round2,
} from './compatibilidade-metrics';
import { wilsonLowerBound } from './wilson';

export type ComputeCompatibilidadeDetalheInput = {
  posicoes: readonly PosicaoComputavel[];
  deputado: DeputadoCompatibilidadeInput;
  totalPosicoesComputaveis: number;
};

function matcherEffect(
  classificacao: DeputadoVotacaoClassification,
  posicao: PosicaoComputavel,
): MatcherEffect {
  if (FORA_DO_DENOMINADOR.has(classificacao)) {
    return 'fora_do_denominador';
  }

  const esperado = posicao.posicao === 'aprovar' ? 'sim' : 'nao';
  return classificacao === esperado ? 'concordancia' : 'discordancia';
}

export function computeCompatibilidadeDetalhe(
  input: ComputeCompatibilidadeDetalheInput,
): DeputadoDetalheComputado {
  let totalConcordancias = 0;
  let totalDiscordancias = 0;
  let totalForaDoDenominador = 0;
  let coberturaExercicio = 0;

  const votos = input.posicoes.map((posicao) => {
    const voto = posicao.votosByDeputado.get(input.deputado.deputadoId) ?? null;
    const situacaoDeputadoVotacao = classifyDeputadoVotacao({
      eventos: input.deputado.eventos,
      votacao: posicao.votacaoReferencia,
      voto,
    });
    const effect = matcherEffect(situacaoDeputadoVotacao, posicao);

    if (!FORA_DE_EXERCICIO.has(situacaoDeputadoVotacao)) {
      coberturaExercicio += 1;
    }
    if (effect === 'concordancia') {
      totalConcordancias += 1;
    } else if (effect === 'discordancia') {
      totalDiscordancias += 1;
    } else {
      totalForaDoDenominador += 1;
    }

    return {
      proposicao: posicao.proposicao,
      posicaoUsuario: posicao.posicao,
      votacaoReferencia: posicao.votacaoReferenciaResumo,
      situacaoDeputadoVotacao,
      matcherEffect: effect,
    };
  });

  const amostraComparavel = totalConcordancias + totalDiscordancias;
  const alertas: AlertaMatcher[] =
    amostraComparavel < input.totalPosicoesComputaveis * 0.5
      ? ['amostra_pequena']
      : [];
  const compatibilidadeBruta =
    amostraComparavel === 0
      ? 0
      : round2((totalConcordancias / amostraComparavel) * 100);

  return {
    externalIdDeputado: input.deputado.externalIdDeputado,
    nome: input.deputado.nome,
    partido: input.deputado.partido,
    siglaUf: input.deputado.siglaUf,
    urlFoto: input.deputado.urlFoto,
    emAtividade: isEmAtividade(input.deputado.eventos),
    metrics: {
      totalConcordancias,
      totalDiscordancias,
      totalForaDoDenominador,
      amostraComparavel,
      coberturaExercicio,
      compatibilidadeBruta,
      scoreOrdenacaoPercentual: round2(
        wilsonLowerBound(totalConcordancias, amostraComparavel) * 100,
      ),
      alertas,
    },
    votos,
  };
}
