export type ProposicaoRow = {
  externalIdProposicao: number;
  uri: string | null;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  externalCodTipo: number | null;
  descricaoTipo: string | null;
  ementa: string | null;
  ementaDetalhada: string | null;
  keywords: string | null;
  dataApresentacao: string | null;
  urlInteiroTeor: string | null;
  ultimoStatusDataHora: string | null;
  ultimoStatusSiglaOrgao: string | null;
  ultimoStatusRegime: string | null;
  ultimoStatusDescricaoSituacao: string | null;
};

export type ProposicaoUpsertResult = {
  inserted: number;
  updated: number;
};

export type ProposicaoRepository = {
  upsert(rows: readonly ProposicaoRow[]): Promise<ProposicaoUpsertResult>;
};
