export type TemaRow = {
  externalCodTema: number;
  tema: string | null;
};

export type ProposicaoTemaRow = {
  externalIdProposicao: number;
  externalCodTema: number;
  proposicaoId: string;
  temaId: string;
};

export type UpsertResult = {
  inserted: number;
  updated: number;
};

export type TemaRepository = {
  upsertTemas(rows: readonly TemaRow[]): Promise<UpsertResult>;
  upsertVinculos(rows: readonly ProposicaoTemaRow[]): Promise<UpsertResult>;
};

export type TemaLookup = {
  loadIdByExternalCodTema(): Promise<ReadonlyMap<number, string>>;
};
