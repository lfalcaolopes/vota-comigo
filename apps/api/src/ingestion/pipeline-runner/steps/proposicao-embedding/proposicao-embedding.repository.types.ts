import type { ProposicaoEmbeddingSource } from '@/proposicoes/rules/proposicao-embedding-source';

export type ProposicaoEmbeddingSourceRow = ProposicaoEmbeddingSource & {
  proposicaoId: string;
  externalIdProposicao: number;
  sourceHash: string | null;
};

export type ProposicaoEmbeddingRow = {
  proposicaoId: string;
  sourceHash: string;
  embedding: readonly number[];
  model: string;
  dim: number;
};

export type ProposicaoEmbeddingUpsertResult = {
  inserted: number;
  updated: number;
};

export type ProposicaoEmbeddingRepository = {
  loadSources(): Promise<readonly ProposicaoEmbeddingSourceRow[]>;
  upsert(
    rows: readonly ProposicaoEmbeddingRow[],
  ): Promise<ProposicaoEmbeddingUpsertResult>;
  deleteNaoComputaveis(): Promise<number>;
};
