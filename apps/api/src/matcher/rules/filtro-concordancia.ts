import { classifyDeputadoVotacao } from '@/exercicio/rules/deputado-votacao';

import type {
  DeputadoCompatibilidadeInput,
  PosicaoComputavel,
} from '../types/compatibilidade.types';

export function passesFiltroConcordancia(
  deputado: DeputadoCompatibilidadeInput,
  posicoesMarcadas: readonly PosicaoComputavel[],
): boolean {
  return posicoesMarcadas.every((posicao) => {
    const voto = posicao.votosByDeputado.get(deputado.deputadoId) ?? null;
    const classificacao = classifyDeputadoVotacao({
      intervalos: deputado.intervalos,
      votacao: posicao.votacaoReferencia,
      voto,
    });

    const esperado = posicao.posicao === 'aprovar' ? 'sim' : 'nao';
    return classificacao === esperado;
  });
}
