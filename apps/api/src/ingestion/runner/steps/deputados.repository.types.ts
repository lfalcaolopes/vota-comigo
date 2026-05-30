export type DeputadoRow = {
  externalIdDeputado: number;
  uri: string | null;
  nome: string | null;
  nomeCivil: string | null;
  siglaSexo: string | null;
  dataNascimento: string | null;
  dataFalecimento: string | null;
  ufNascimento: string | null;
  municipioNascimento: string | null;
  urlRedeSocial: string | null;
  urlWebsite: string | null;
  legislaturaInicialId: string | null;
  legislaturaFinalId: string | null;
};

export type DeputadoUpsertResult = {
  inserted: number;
  updated: number;
};

export type DeputadoRepository = {
  upsert(rows: readonly DeputadoRow[]): Promise<DeputadoUpsertResult>;
};

/**
 * Resolve a foreign key interna de `legislatura` a partir do identificador
 * externo da Câmara, sem duplicar o id externo em `deputado`.
 */
export type LegislaturaLookup = {
  loadIdByExternalId(): Promise<ReadonlyMap<number, string>>;
};
