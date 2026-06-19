import type {
  ProposicaoResumoIaRepository,
  ProposicaoResumoIaRow,
} from './proposicao-resumo-ia.repository.types';
import { proposicaoResumoIaJsonSchema } from './proposicao-resumo-ia-json.schema';

export type ProposicaoResumoIaImportResult = {
  imported: number;
  missing: number[];
};

export async function importProposicaoResumoIaJson(
  input: unknown,
  deps: { repository: ProposicaoResumoIaRepository },
): Promise<ProposicaoResumoIaImportResult> {
  const json = proposicaoResumoIaJsonSchema.parse(input);
  const externalIds = Object.keys(json.items).map((key) => Number(key));
  const proposicaoIds = await deps.repository.resolveProposicaoIds(externalIds);
  const missing: number[] = [];
  const rows: ProposicaoResumoIaRow[] = [];

  for (const externalId of externalIds) {
    const proposicaoId = proposicaoIds.get(externalId);
    if (proposicaoId === undefined) {
      missing.push(externalId);
      continue;
    }

    const item = json.items[String(externalId)];
    rows.push({
      proposicaoId,
      sourceHash: item.sourceHash,
      generationStatus: item.generationStatus,
      reviewStatus: item.reviewStatus,
      resumoCard: item.resumoCard,
      resumoDetalhe: item.resumoDetalhe,
      model: item.model,
      promptVersion: item.promptVersion,
      generatedAt: item.generatedAt,
      reviewedAt: item.reviewedAt,
    });
  }

  if (rows.length > 0) {
    await deps.repository.upsert(rows);
  }

  return { imported: rows.length, missing };
}
