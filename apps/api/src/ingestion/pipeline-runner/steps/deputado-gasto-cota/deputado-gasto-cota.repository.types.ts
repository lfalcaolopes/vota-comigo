// Menor unidade produzida pela agregação; o banco guarda o par deputado-ano
// inteiro, porque toda leitura do perfil quer o conjunto completo do ano.
export type DeputadoGastoCotaRow = {
  deputadoId: string;
  year: number;
  month: number;
  siglaUf: string;
  externalNumSubCota: number;
  descricao: string;
  valorUtilizadoCentavos: number;
};

// { mês: { numSubCota: centavos } }
export type GastoCotaJson = Record<string, Record<string, number>>;

export type DeputadoGastoCotaAnoRow = {
  deputadoId: string;
  year: number;
  siglaUf: string;
  gastosJson: GastoCotaJson;
};

export type CotaCategoriaRow = {
  externalNumSubCota: number;
  descricao: string;
};

export type ReplaceAnoInput = {
  year: number;
  coveredThroughMonth: number;
  rows: readonly DeputadoGastoCotaAnoRow[];
  categorias: readonly CotaCategoriaRow[];
};

export type DeputadoGastoCotaRepository = {
  loadDeputadoIdByExternalId(): Promise<ReadonlyMap<number, string>>;
  replaceAno(input: ReplaceAnoInput): Promise<{ inserted: number }>;
};
