import type { ProposicaoDetalhe } from '@vota-comigo/shared-types';

import type {
  ProposicaoResumoIaCardProjection,
  ProposicaoResumoIaProjection,
} from '../types/proposicoes.types';

function hasPublicCard(
  resumoIa: ProposicaoResumoIaCardProjection | null,
): boolean {
  return (
    resumoIa !== null &&
    resumoIa.generationStatus === 'generated' &&
    resumoIa.reviewStatus === 'approved' &&
    resumoIa.resumoCard !== null
  );
}

export function toResumoIaCardFields(
  resumoIa: ProposicaoResumoIaCardProjection | null,
): Pick<ProposicaoDetalhe, 'resumoIaDisponivel' | 'resumoIaCard'> {
  if (resumoIa === null || !hasPublicCard(resumoIa)) {
    return { resumoIaDisponivel: false, resumoIaCard: null };
  }

  return { resumoIaDisponivel: true, resumoIaCard: resumoIa.resumoCard };
}

export function toResumoIaContractFields(
  resumoIa: ProposicaoResumoIaProjection | null,
): Pick<
  ProposicaoDetalhe,
  'resumoIaDisponivel' | 'resumoIaCard' | 'resumoIaDetalhe'
> {
  if (
    resumoIa === null ||
    !hasPublicCard(resumoIa) ||
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
