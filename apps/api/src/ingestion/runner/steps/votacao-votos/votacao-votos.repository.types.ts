import type { VotoCategoria } from '../../shared/votacoes-votos.normalizer';

export type VotosJson = Record<VotoCategoria, string[]>;

export type VotacaoVotosRow = {
  externalIdVotacao: string;
  votacaoId: string;
  votosJson: VotosJson;
  votosSim: number;
  votosNao: number;
  votosAbstencao: number;
  votosObstrucao: number;
  votosArtigo17: number;
  votosNaoInformado: number;
};

export type VotacaoVotosUpsertResult = {
  inserted: number;
  updated: number;
};

export type VotacaoVotosRepository = {
  upsert(rows: readonly VotacaoVotosRow[]): Promise<VotacaoVotosUpsertResult>;
};

export type DeputadoLookup = {
  loadIdByExternalId(): Promise<ReadonlyMap<number, string>>;
};
