export type OutrosDerivado = {
  abstencao: number;
  obstrucao: number;
  artigo17: number;
  naoInformado: number;
};

export type PlacarComparisonRow = {
  externalIdVotacao: string;
  votosSimOficial: number | null;
  votosNaoOficial: number | null;
  votosSimDerivado: number;
  votosNaoDerivado: number;
  outrosDerivado: OutrosDerivado;
};

export type SanityRepository = {
  loadPlacares(): Promise<readonly PlacarComparisonRow[]>;
};
