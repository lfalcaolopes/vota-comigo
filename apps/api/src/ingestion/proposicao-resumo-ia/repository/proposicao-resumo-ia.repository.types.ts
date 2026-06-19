import type {
  ProposicaoResumoIaGenerationStatus,
  ProposicaoResumoIaReviewStatus,
} from '@vota-comigo/shared-types';
import type { ProposicaoResumoIaSource } from '../../../proposicoes/rules/proposicao-resumo-ia-source';

export type ProposicaoResumoIaRow = {
  proposicaoId: string;
  sourceHash: string;
  generationStatus: ProposicaoResumoIaGenerationStatus;
  reviewStatus: ProposicaoResumoIaReviewStatus;
  resumoCard: string | null;
  resumoDetalhe: string | null;
  model: string | null;
  promptVersion: string | null;
  generatedAt: string | null;
  reviewedAt: string | null;
};

export type ProposicaoResumoIaUpsertResult = {
  inserted: number;
  updated: number;
};

export type ProposicaoResumoIaRepository = {
  resolveProposicaoIds(
    externalIds: readonly number[],
  ): Promise<ReadonlyMap<number, string>>;
  upsert(
    rows: readonly ProposicaoResumoIaRow[],
  ): Promise<ProposicaoResumoIaUpsertResult>;
  loadProposicoesComputaveisSources(): Promise<
    readonly ProposicaoResumoIaSource[]
  >;
};
