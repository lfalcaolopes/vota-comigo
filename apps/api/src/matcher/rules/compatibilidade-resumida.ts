import type {
  AlertaMatcher,
  DeputadoVotacaoClassification,
} from '@vota-comigo/shared-types';

import { classifyDeputadoVotacao } from '@/exercicio/rules/deputado-votacao';
import {
  deriveIntervalosExercicio,
  isEmAtividade,
} from '@/exercicio/rules/intervalos-exercicio';

import type {
  CompatibilidadeResumidaResult,
  DeputadoCompatibilidadeInput,
  DeputadoResumoComputado,
  PosicaoComputavel,
} from '../types/compatibilidade.types';
import { wilsonLowerBound } from './wilson';

export type ComputeCompatibilidadeResumidaInput = {
  posicoes: readonly PosicaoComputavel[];
  deputados: readonly DeputadoCompatibilidadeInput[];
  totalPosicoesComputaveis: number;
};

const FORA_DO_DENOMINADOR: ReadonlySet<DeputadoVotacaoClassification> = new Set(
  ['fora_de_exercicio', 'artigo_17', 'voto_nao_informado', 'lacuna_de_dados'],
);

const FORA_DE_EXERCICIO: ReadonlySet<DeputadoVotacaoClassification> = new Set([
  'fora_de_exercicio',
  'lacuna_de_dados',
]);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function avaliarDeputado(
  deputado: DeputadoCompatibilidadeInput,
  posicoes: readonly PosicaoComputavel[],
  totalPosicoesComputaveis: number,
): DeputadoResumoComputado | null {
  let amostraComparavel = 0;
  let concordancias = 0;
  let coberturaExercicio = 0;

  for (const posicao of posicoes) {
    const voto = posicao.votosByDeputado.get(deputado.deputadoId) ?? null;
    const classificacao = classifyDeputadoVotacao({
      eventos: deputado.eventos,
      votacao: posicao.votacaoReferencia,
      voto,
    });

    if (!FORA_DE_EXERCICIO.has(classificacao)) {
      coberturaExercicio += 1;
    }

    if (FORA_DO_DENOMINADOR.has(classificacao)) {
      continue;
    }

    amostraComparavel += 1;
    const esperado = posicao.posicao === 'aprovar' ? 'sim' : 'nao';
    if (classificacao === esperado) {
      concordancias += 1;
    }
  }

  if (amostraComparavel === 0) {
    return null;
  }

  const alertas: AlertaMatcher[] =
    amostraComparavel < totalPosicoesComputaveis * 0.5
      ? ['amostra_pequena']
      : [];

  return {
    externalIdDeputado: deputado.externalIdDeputado,
    nome: deputado.nome,
    partido: deputado.partido,
    siglaUf: deputado.siglaUf,
    urlFoto: deputado.urlFoto,
    compatibilidadeBruta: round2((concordancias / amostraComparavel) * 100),
    amostraComparavel,
    scoreOrdenacaoPercentual: round2(
      wilsonLowerBound(concordancias, amostraComparavel) * 100,
    ),
    alertas,
    emAtividade: isEmAtividade(deputado.eventos),
    coberturaExercicio,
  };
}

export function computeCompatibilidadeResumida(
  input: ComputeCompatibilidadeResumidaInput,
): CompatibilidadeResumidaResult {
  const deputados: DeputadoResumoComputado[] = [];
  let deputadosHistoricoIncompleto = 0;

  for (const deputado of input.deputados) {
    // histórico vazio é lacuna de dados, distinta de amostra zero
    if (deriveIntervalosExercicio(deputado.eventos).length === 0) {
      deputadosHistoricoIncompleto += 1;
      continue;
    }

    const resumo = avaliarDeputado(
      deputado,
      input.posicoes,
      input.totalPosicoesComputaveis,
    );
    if (resumo !== null) {
      deputados.push(resumo);
    }
  }

  return {
    deputados,
    totalDeputadosAvaliados: input.deputados.length,
    deputadosHistoricoIncompleto,
  };
}
