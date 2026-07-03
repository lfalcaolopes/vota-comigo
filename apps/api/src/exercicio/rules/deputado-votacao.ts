import type {
  DeputadoVotacaoClassification,
  VotoCategoria,
} from '@vota-comigo/shared-types';
import type { IntervaloExercicio, VotacaoRef } from '../types/exercicio.types';
import {
  isEmExercicioFromIntervalos,
  resolveVotacaoTimestamp,
} from './intervalos-exercicio';

export type ClassifyDeputadoVotacaoInput = {
  intervalos: readonly IntervaloExercicio[];
  votacao: VotacaoRef;
  voto: VotoCategoria | null;
};

export function classifyDeputadoVotacao(
  input: ClassifyDeputadoVotacaoInput,
): DeputadoVotacaoClassification {
  // um registro de voto sobrepõe o histórico: presença em votacao_votos implica
  // que o deputado estava em exercício, mais confiável que os intervalos derivados
  if (input.voto === 'artigo_17') {
    return 'artigo_17';
  }

  if (input.voto === 'nao_informado') {
    return 'voto_nao_informado';
  }

  if (
    input.voto === 'sim' ||
    input.voto === 'nao' ||
    input.voto === 'abstencao' ||
    input.voto === 'obstrucao'
  ) {
    return input.voto;
  }

  // sem registro de voto, o histórico decide a condição de exercício
  const instante = resolveVotacaoTimestamp(input.votacao);

  if (input.intervalos.length === 0 || instante === null) {
    return 'lacuna_de_dados';
  }

  if (!isEmExercicioFromIntervalos(input.intervalos, instante)) {
    return 'fora_de_exercicio';
  }

  return 'ausencia_sem_motivo_conhecido';
}
