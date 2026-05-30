export type LegislaturaRow = {
  externalIdLegislatura: number;
  uri: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  anoEleicao: number | null;
};

export type LegislaturaUpsertResult = {
  inserted: number;
  updated: number;
};

export type LegislaturaRepository = {
  upsert(rows: readonly LegislaturaRow[]): Promise<LegislaturaUpsertResult>;
};
