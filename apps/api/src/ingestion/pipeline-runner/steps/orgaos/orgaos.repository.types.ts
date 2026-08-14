export type OrgaoRow = {
  externalIdOrgao: number;
  uri: string;
  sigla: string | null;
  apelido: string | null;
  nome: string | null;
  nomePublicacao: string | null;
  externalCodTipoOrgao: number | null;
  tipoOrgao: string | null;
  casa: string | null;
};

export type OrgaoUpsertResult = {
  inserted: number;
  updated: number;
};

export type OrgaoRepository = {
  upsert(rows: readonly OrgaoRow[]): Promise<OrgaoUpsertResult>;
};
