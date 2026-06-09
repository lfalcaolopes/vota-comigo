import type { DeputadoVotacaoClassification } from '@vota-comigo/shared-types';

import { classifyDeputadoVotacao } from '@/exercicio/rules/deputado-votacao';
import { deriveIntervalosExercicio } from '@/exercicio/rules/intervalos-exercicio';

import type {
  CompatibilidadeResumidaResult,
  DeputadoCompatibilidadeInput,
  DeputadoResumoComputado,
  PosicaoComputavel,
} from '../types/compatibilidade.types';

export type ComputeCompatibilidadeResumidaInput = {
  posicoes: readonly PosicaoComputavel[];
  deputados: readonly DeputadoCompatibilidadeInput[];
};

const FORA_DO_DENOMINADOR: ReadonlySet<DeputadoVotacaoClassification> = new Set(
  ['fora_de_exercicio', 'artigo_17', 'voto_nao_informado', 'lacuna_de_dados'],
);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function avaliarDeputado(
  deputado: DeputadoCompatibilidadeInput,
  posicoes: readonly PosicaoComputavel[],
): DeputadoResumoComputado | null {
  let amostraComparavel = 0;
  let concordancias = 0;

  for (const posicao of posicoes) {
    const voto = posicao.votosByDeputado.get(deputado.deputadoId) ?? null;
    const classificacao = classifyDeputadoVotacao({
      eventos: deputado.eventos,
      votacao: posicao.votacaoReferencia,
      voto,
    });

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

  return {
    externalIdDeputado: deputado.externalIdDeputado,
    nome: deputado.nome,
    partido: deputado.partido,
    siglaUf: deputado.siglaUf,
    urlFoto: deputado.urlFoto,
    compatibilidadeBruta: round2((concordancias / amostraComparavel) * 100),
    amostraComparavel,
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

    const resumo = avaliarDeputado(deputado, input.posicoes);
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
