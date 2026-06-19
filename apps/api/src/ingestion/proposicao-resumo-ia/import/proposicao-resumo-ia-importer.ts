import type {
  ProposicaoResumoIaRepository,
  ProposicaoResumoIaRow,
} from '../repository/proposicao-resumo-ia.repository.types';
import { proposicaoResumoIaJsonSchema } from '../schemas/proposicao-resumo-ia-json.schema';

export type ProposicaoResumoIaImportReport = {
  filesRead: number;
  validItems: number;
  imported: number;
  inserted: number;
  updated: number;
  skipped: number;
  missingExternalIdProposicao: number[];
};

export async function importProposicaoResumoIaJson(
  input: unknown,
  deps: { repository: ProposicaoResumoIaRepository },
): Promise<ProposicaoResumoIaImportReport> {
  const json = proposicaoResumoIaJsonSchema.parse(input);
  const externalIds = Object.keys(json.items).map((key) => Number(key));
  const proposicaoIds = await deps.repository.resolveProposicaoIds(externalIds);
  const missingExternalIdProposicao: number[] = [];
  const rows: ProposicaoResumoIaRow[] = [];

  for (const externalId of externalIds) {
    const proposicaoId = proposicaoIds.get(externalId);
    if (proposicaoId === undefined) {
      missingExternalIdProposicao.push(externalId);
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

  const upsertResult =
    rows.length > 0
      ? await deps.repository.upsert(rows)
      : { inserted: 0, updated: 0 };

  return {
    filesRead: 1,
    validItems: externalIds.length,
    imported: rows.length,
    inserted: upsertResult.inserted,
    updated: upsertResult.updated,
    skipped: missingExternalIdProposicao.length,
    missingExternalIdProposicao,
  };
}
