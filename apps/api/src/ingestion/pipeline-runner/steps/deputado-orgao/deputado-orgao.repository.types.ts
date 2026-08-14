export type DeputadoOrgaoRow = {
  deputadoId: string;
  orgaoId: string;
  legislaturaId: string;
  cargo: string | null;
  dataInicio: string;
  dataFim: string | null;
};

export type DeputadoOrgaoReplaceResult = {
  inserted: number;
};

export type DeputadoOrgaoRepository = {
  loadDeputadoIdByExternalId(): Promise<ReadonlyMap<number, string>>;
  loadLegislaturaIdByExternalId(): Promise<ReadonlyMap<number, string>>;
  loadOrgaoIdByExternalId(): Promise<ReadonlyMap<number, string>>;
  replaceLegislatura(
    legislaturaId: string,
    rows: readonly DeputadoOrgaoRow[],
  ): Promise<DeputadoOrgaoReplaceResult>;
};
