import type {
  EscopoMatcher,
  MatcherDeputadoResumo,
  MatcherExecucaoResumo,
  MatcherResultado,
} from '@vota-comigo/shared-types';

import { nomePublicoDeputado } from '@/shared/deputado/nome-publico';

import type {
  CompatibilidadeResumidaResult,
  DeputadoResumoComputado,
} from '../types/compatibilidade.types';

type PaginacaoResultado = {
  limit: number;
  offset: number;
  total: number;
};

function toDeputadoResumo(
  deputado: DeputadoResumoComputado,
): MatcherDeputadoResumo {
  return {
    externalIdDeputado: deputado.externalIdDeputado,
    nome: nomePublicoDeputado({
      nomeEleitoral: deputado.nomeEleitoral,
      nome: deputado.nome,
      nomeCivil: deputado.nomeCivil,
    }),
    partido: deputado.partido,
    siglaUf: deputado.siglaUf,
    urlFoto: deputado.urlFoto,
    compatibilidadeBruta: deputado.compatibilidadeBruta,
    amostraComparavel: deputado.amostraComparavel,
    scoreOrdenacaoPercentual: deputado.scoreOrdenacaoPercentual,
    alertas: [...deputado.alertas],
    emAtividade: deputado.emAtividade,
    usoCota: deputado.usoCota ?? {
      status: 'indisponivel',
      legislatura: null,
      motivo: 'fonte-incompleta',
    },
  };
}

export function toMatcherResultado(
  resumo: MatcherExecucaoResumo,
  escopo: EscopoMatcher,
  resultado: Omit<CompatibilidadeResumidaResult, 'deputados'>,
  deputados: readonly DeputadoResumoComputado[],
  paginacao: PaginacaoResultado,
): MatcherResultado {
  return {
    ...resumo,
    escopo,
    deputados: deputados.map(toDeputadoResumo),
    totalDeputadosAvaliados: resultado.totalDeputadosAvaliados,
    deputadosHistoricoIncompleto: resultado.deputadosHistoricoIncompleto,
    total: paginacao.total,
    limit: paginacao.limit,
    offset: paginacao.offset,
  };
}
