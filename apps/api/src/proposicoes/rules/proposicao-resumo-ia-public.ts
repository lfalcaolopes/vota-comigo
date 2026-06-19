import type { ProposicaoDetalhe } from '@vota-comigo/shared-types';

import type { ProposicaoResumoIaProjection } from '../types/proposicoes.types';
import {
  calculateProposicaoResumoIaSourceHash,
  type ProposicaoResumoIaSource,
} from './proposicao-resumo-ia-source';

export function toResumoIaContractFields(
  source: ProposicaoResumoIaSource,
  resumoIa: ProposicaoResumoIaProjection | null,
): Pick<
  ProposicaoDetalhe,
  'resumoIaDisponivel' | 'resumoIaCard' | 'resumoIaDetalhe'
> {
  const currentSourceHash = calculateProposicaoResumoIaSourceHash(source);

  if (
    resumoIa === null ||
    resumoIa.generationStatus !== 'generated' ||
    resumoIa.reviewStatus !== 'approved' ||
    resumoIa.sourceHash !== currentSourceHash ||
    resumoIa.resumoCard === null ||
    resumoIa.resumoDetalhe === null
  ) {
    return {
      resumoIaDisponivel: false,
      resumoIaCard: null,
      resumoIaDetalhe: null,
    };
  }

  return {
    resumoIaDisponivel: true,
    resumoIaCard: resumoIa.resumoCard,
    resumoIaDetalhe: resumoIa.resumoDetalhe,
  };
}
