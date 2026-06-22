import {
  calculateProposicaoResumoIaSourceHash,
  type ProposicaoResumoIaSource,
} from '../../../proposicoes/rules/proposicao-resumo-ia-source';
import type { ProposicaoResumoIaJson } from '../schemas/proposicao-resumo-ia-json.schema';
import type { ResumoIaGenerationOutcome } from './openrouter-resumo-ia-client';

export type ProposicaoResumoIaGenerationResult = {
  source: ProposicaoResumoIaSource;
  outcome: ResumoIaGenerationOutcome;
};

export type ProposicaoResumoIaApplyReport = {
  generated: number;
  insufficientSource: number;
  error: number;
};

export function selectProposicaoResumoIaGenerationTargets(input: {
  sources: readonly ProposicaoResumoIaSource[];
  files: readonly ProposicaoResumoIaJson[];
  regenerate: boolean;
  onlyStale?: boolean;
}): readonly ProposicaoResumoIaSource[] {
  const { sources, files, regenerate, onlyStale = false } = input;

  if (regenerate) {
    return sources.filter((src) => src.ano !== null);
  }

  const existingItems = new Map<
    string,
    ProposicaoResumoIaJson['items'][string]
  >();
  for (const file of files) {
    for (const [key, item] of Object.entries(file.items)) {
      existingItems.set(`${file.ano}:${key}`, item);
    }
  }

  return sources.filter((src) => {
    if (src.ano === null) return false;
    const key = `${src.ano}:${String(src.externalIdProposicao)}`;
    const existing = existingItems.get(key);
    if (onlyStale) {
      return existing?.reviewStatus === 'stale';
    }
    if (existing === undefined) return true;
    return existing.generationStatus === 'error';
  });
}

export function applyProposicaoResumoIaGeneration(input: {
  files: readonly ProposicaoResumoIaJson[];
  results: readonly ProposicaoResumoIaGenerationResult[];
  model: string;
  promptVersion: string;
  generatedAt: string;
}): {
  files: readonly ProposicaoResumoIaJson[];
  report: ProposicaoResumoIaApplyReport;
} {
  const { files, results, model, promptVersion, generatedAt } = input;

  const filesByAno = new Map<number, ProposicaoResumoIaJson>(
    files.map((f) => [f.ano, f]),
  );

  const updatedItemsByAno = new Map<
    number,
    Record<string, ProposicaoResumoIaJson['items'][string]>
  >(files.map((f) => [f.ano, { ...f.items }]));

  const changedAnos = new Set<number>();
  const newAnoFiles = new Map<number, ProposicaoResumoIaJson>();
  const report: ProposicaoResumoIaApplyReport = {
    generated: 0,
    insufficientSource: 0,
    error: 0,
  };

  for (const { source, outcome } of results) {
    const ano = source.ano;
    if (ano === null) continue;

    const key = String(source.externalIdProposicao);
    const sourceHash = calculateProposicaoResumoIaSourceHash(source);
    const newItem = buildItem({
      outcome,
      model,
      promptVersion,
      generatedAt,
      sourceHash,
    });

    if (filesByAno.has(ano)) {
      updatedItemsByAno.get(ano)![key] = newItem;
      changedAnos.add(ano);
    } else if (newAnoFiles.has(ano)) {
      const newFile = newAnoFiles.get(ano)!;
      newAnoFiles.set(ano, {
        ...newFile,
        items: { ...newFile.items, [key]: newItem },
      });
    } else {
      newAnoFiles.set(ano, { ano, items: { [key]: newItem } });
    }

    if (outcome.ok && outcome.response.status === 'generated') {
      report.generated++;
    } else if (
      outcome.ok &&
      outcome.response.status === 'insufficient_source'
    ) {
      report.insufficientSource++;
    } else {
      report.error++;
    }
  }

  const updatedExistingFiles = files.map((file) => {
    if (!changedAnos.has(file.ano)) return file;
    return { ...file, items: updatedItemsByAno.get(file.ano)! };
  });

  const allFiles = [...updatedExistingFiles, ...newAnoFiles.values()].sort(
    (a, b) => a.ano - b.ano,
  );

  return { files: allFiles, report };
}

function buildItem(input: {
  outcome: ResumoIaGenerationOutcome;
  model: string;
  promptVersion: string;
  generatedAt: string;
  sourceHash: string;
}): ProposicaoResumoIaJson['items'][string] {
  const { outcome, model, promptVersion, generatedAt, sourceHash } = input;

  if (outcome.ok && outcome.response.status === 'generated') {
    return {
      sourceHash,
      generationStatus: 'generated',
      reviewStatus: 'pending',
      resumoCard: outcome.response.resumoCard,
      resumoDetalhe: outcome.response.resumoDetalhe,
      model,
      promptVersion,
      generatedAt,
      reviewedAt: null,
    };
  }

  if (outcome.ok && outcome.response.status === 'insufficient_source') {
    return {
      sourceHash,
      generationStatus: 'insufficient_source',
      reviewStatus: 'pending',
      resumoCard: null,
      resumoDetalhe: null,
      model,
      promptVersion,
      generatedAt,
      reviewedAt: null,
    };
  }

  return {
    sourceHash,
    generationStatus: 'error',
    reviewStatus: 'pending',
    resumoCard: null,
    resumoDetalhe: null,
    model,
    promptVersion,
    generatedAt,
    reviewedAt: null,
  };
}
