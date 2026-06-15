import type { TemaDisponivel } from '@vota-comigo/shared-types';

import type { ProposicaoTemaRow } from '../types/proposicoes.types';

export type { ProposicaoTemaRow };

export function toTemasDisponiveis(
  temaRows: readonly ProposicaoTemaRow[],
  computableIds: ReadonlySet<number>,
): readonly TemaDisponivel[] {
  const seen = new Map<number, TemaDisponivel>();

  for (const row of temaRows) {
    if (row.tema === null) continue;
    if (!computableIds.has(row.externalIdProposicao)) continue;
    if (seen.has(row.externalCodTema)) continue;
    seen.set(row.externalCodTema, {
      externalCodTema: row.externalCodTema,
      tema: row.tema,
    });
  }

  return [...seen.values()].sort((a, b) => {
    const cmp = a.tema.localeCompare(b.tema, 'pt-BR');
    return cmp !== 0 ? cmp : a.externalCodTema - b.externalCodTema;
  });
}
