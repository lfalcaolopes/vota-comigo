export type IngestedDeputado = {
  id: string;
  externalIdDeputado: number;
};

export type DeputadoSource = {
  loadIngested(): Promise<readonly IngestedDeputado[]>;
};

export type HistoricoEvento = {
  dataHora: string;
  situacao: string | null;
  condicaoEleitoral: string | null;
  descricaoStatus: string;
  siglaPartido: string | null;
  uriPartido: string | null;
  idLegislatura: number | null;
  nome: string | null;
  nomeEleitoral: string | null;
  siglaUf: string | null;
  email: string | null;
  urlFoto: string | null;
};

export type DeputadoHistoricoFetchResult =
  | { ok: true; eventos: readonly HistoricoEvento[] }
  | { ok: false; reason: string };

export type DeputadoHistoricoClient = {
  fetch(externalIdDeputado: number): Promise<DeputadoHistoricoFetchResult>;
};

export type PartidoLookup = {
  loadIdByExternalId(): Promise<ReadonlyMap<number, string>>;
};

export type DeputadoHistoricoRow = {
  deputadoId: string;
  legislaturaId: string;
  partidoId: string | null;
  dataHora: string;
  situacao: string | null;
  condicaoEleitoral: string | null;
  descricaoStatus: string;
  nome: string | null;
  nomeEleitoral: string | null;
  siglaUf: string | null;
  email: string | null;
  urlFoto: string | null;
};

export type DeputadoHistoricoUpsertResult = {
  inserted: number;
  updated: number;
};

export type DeputadoHistoricoRepository = {
  upsert(
    rows: readonly DeputadoHistoricoRow[],
  ): Promise<DeputadoHistoricoUpsertResult>;
};
