import {
  calculateProposicaoResumoIaSourceHash,
  type ProposicaoResumoIaSource,
} from '../proposicoes/rules/proposicao-resumo-ia-source';
import type { ProposicaoResumoIaJson } from './proposicao-resumo-ia-json.schema';

export type ProposicaoResumoIaReconcileReport = {
  proposicoesComputaveis: number;
  preserved: number;
  markedStale: number;
  pendingExternalIdProposicao: number[];
};

export function reconcileProposicaoResumoIa(input: {
  sources: readonly ProposicaoResumoIaSource[];
  files: readonly ProposicaoResumoIaJson[];
}): {
  files: readonly ProposicaoResumoIaJson[];
  report: ProposicaoResumoIaReconcileReport;
} {
  const filesByAno = new Map<number, ProposicaoResumoIaJson>(
    input.files.map((file) => [file.ano, file]),
  );

  const updatedItemsByAno = new Map<
    number,
    Record<string, ProposicaoResumoIaJson['items'][string]>
  >(input.files.map((file) => [file.ano, { ...file.items }]));

  const changedAnos = new Set<number>();
  let preserved = 0;
  let markedStale = 0;
  const pendingExternalIdProposicao: number[] = [];

  for (const src of input.sources) {
    const currentHash = calculateProposicaoResumoIaSourceHash(src);
    const key = String(src.externalIdProposicao);
    const ano = src.ano;

    if (ano === null) {
      pendingExternalIdProposicao.push(src.externalIdProposicao);
      continue;
    }

    const file = filesByAno.get(ano);
    if (file === undefined) {
      pendingExternalIdProposicao.push(src.externalIdProposicao);
      continue;
    }

    const item = file.items[key];
    if (item === undefined) {
      pendingExternalIdProposicao.push(src.externalIdProposicao);
      continue;
    }

    if (item.sourceHash === currentHash) {
      preserved++;
    } else if (item.reviewStatus !== 'stale') {
      updatedItemsByAno.get(ano)![key] = { ...item, reviewStatus: 'stale' };
      changedAnos.add(ano);
      markedStale++;
    }
  }

  const files = input.files.map((file) => {
    if (!changedAnos.has(file.ano)) {
      return file;
    }
    return { ...file, items: updatedItemsByAno.get(file.ano)! };
  });

  return {
    files,
    report: {
      proposicoesComputaveis: input.sources.length,
      preserved,
      markedStale,
      pendingExternalIdProposicao,
    },
  };
}
