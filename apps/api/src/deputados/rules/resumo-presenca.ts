import type {
  DeputadoResumoPresenca,
  DeputadoVotacaoClassification,
  VotoCategoria,
} from '@vota-comigo/shared-types';

import { classifyDeputadoVotacao } from '@/exercicio/rules/deputado-votacao';
import type {
  EventoExercicio,
  VotacaoRef,
} from '@/exercicio/types/exercicio.types';

const PRESENCA_CATEGORIAS = new Set<DeputadoVotacaoClassification>([
  'sim',
  'nao',
  'abstencao',
  'obstrucao',
  'artigo_17',
  'voto_nao_informado',
]);

export type VotacaoParaPresenca = {
  votacao: VotacaoRef;
  voto: VotoCategoria | null;
};

export type DeriveResumoPresencaInput = {
  eventos: readonly EventoExercicio[];
  votacoes: readonly VotacaoParaPresenca[];
};

export type ResumoPresencaResult = {
  resumoPresencaDisponivel: boolean;
  resumoPresenca: DeputadoResumoPresenca | null;
};

export function deriveResumoPresenca(
  input: DeriveResumoPresencaInput,
): ResumoPresencaResult {
  let presencas = 0;
  let ausenciasSemMotivoConhecido = 0;

  for (const { votacao, voto } of input.votacoes) {
    const classification = classifyDeputadoVotacao({
      eventos: input.eventos,
      votacao,
      voto,
    });

    if (PRESENCA_CATEGORIAS.has(classification)) {
      presencas++;
    } else if (classification === 'ausencia_sem_motivo_conhecido') {
      ausenciasSemMotivoConhecido++;
    }
  }

  const totalVotacoesEmExercicio = presencas + ausenciasSemMotivoConhecido;

  if (totalVotacoesEmExercicio === 0) {
    return { resumoPresencaDisponivel: false, resumoPresenca: null };
  }

  const percentualPresenca = (presencas / totalVotacoesEmExercicio) * 100;

  return {
    resumoPresencaDisponivel: true,
    resumoPresenca: {
      percentualPresenca,
      presencas,
      totalVotacoesEmExercicio,
      ausenciasSemMotivoConhecido,
    },
  };
}
