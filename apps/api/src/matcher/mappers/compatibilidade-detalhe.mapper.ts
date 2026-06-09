import type {
  MatcherDeputadoDetalhe,
  MatcherExecucaoResumo,
} from '@vota-comigo/shared-types';

import type { DeputadoDetalheComputado } from '../types/compatibilidade.types';

export function toMatcherDeputadoDetalhe(
  resumo: MatcherExecucaoResumo,
  detalhe: DeputadoDetalheComputado,
): MatcherDeputadoDetalhe {
  return {
    ...resumo,
    deputado: {
      externalIdDeputado: detalhe.externalIdDeputado,
      nome: detalhe.nome,
      partido: detalhe.partido,
      siglaUf: detalhe.siglaUf,
      urlFoto: detalhe.urlFoto,
      emAtividade: detalhe.emAtividade,
    },
    metrics: {
      ...detalhe.metrics,
      alertas: [...detalhe.metrics.alertas],
    },
    votos: detalhe.votos.map((voto) => ({
      proposicao: voto.proposicao,
      posicaoUsuario: voto.posicaoUsuario,
      votacaoReferencia: voto.votacaoReferencia,
      situacaoDeputadoVotacao: voto.situacaoDeputadoVotacao,
      matcherEffect: voto.matcherEffect,
    })),
  };
}
