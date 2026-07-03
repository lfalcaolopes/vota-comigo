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
  foraDeExercicio: number;
  lacunaDeDados: number;
};

export type ResumoPresencaCounts = {
  presencas: number;
  ausenciasSemMotivoConhecido: number;
};

// Deriva o contrato público a partir dos contadores persistidos. Pressupõe
// total > 0, garantido porque só gravamos presença quando disponível.
export function toResumoPresenca(
  counts: ResumoPresencaCounts,
): DeputadoResumoPresenca {
  const totalVotacoesEmExercicio =
    counts.presencas + counts.ausenciasSemMotivoConhecido;

  return {
    percentualPresenca: (counts.presencas / totalVotacoesEmExercicio) * 100,
    presencas: counts.presencas,
    totalVotacoesEmExercicio,
    ausenciasSemMotivoConhecido: counts.ausenciasSemMotivoConhecido,
  };
}

export function deriveResumoPresenca(
  input: DeriveResumoPresencaInput,
): ResumoPresencaResult {
  let presencas = 0;
  let ausenciasSemMotivoConhecido = 0;
  let foraDeExercicio = 0;
  let lacunaDeDados = 0;

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
    } else if (classification === 'fora_de_exercicio') {
      foraDeExercicio++;
    } else if (classification === 'lacuna_de_dados') {
      lacunaDeDados++;
    }
  }

  const totalVotacoesEmExercicio = presencas + ausenciasSemMotivoConhecido;

  if (totalVotacoesEmExercicio === 0) {
    return {
      resumoPresencaDisponivel: false,
      resumoPresenca: null,
      foraDeExercicio,
      lacunaDeDados,
    };
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
    foraDeExercicio,
    lacunaDeDados,
  };
}
