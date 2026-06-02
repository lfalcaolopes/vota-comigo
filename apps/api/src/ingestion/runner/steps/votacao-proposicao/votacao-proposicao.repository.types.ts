export type VotacaoProposicaoRow = {
  externalIdVotacao: string;
  externalIdProposicao: number;
  votacaoId: string | null;
  proposicaoId: string | null;
};

export type VotacaoProposicaoUpsertResult = {
  inserted: number;
  updated: number;
};

export type VotacaoProposicaoRepository = {
  upsert(
    rows: readonly VotacaoProposicaoRow[],
  ): Promise<VotacaoProposicaoUpsertResult>;
};

export type VotacaoLookup = {
  loadIdByExternalId(): Promise<ReadonlyMap<string, string>>;
};

export type ProposicaoLookup = {
  loadIdByExternalId(): Promise<ReadonlyMap<number, string>>;
};
