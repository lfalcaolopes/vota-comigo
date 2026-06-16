import type { EscopoVotacao } from '../../shared/escopo-votacao';

export type { EscopoVotacao };

export type VotacaoRow = {
  externalIdVotacao: string;
  uri: string | null;
  data: string | null;
  dataHoraRegistro: string | null;
  externalIdOrgao: number | null;
  siglaOrgao: string | null;
  escopoVotacao: EscopoVotacao;
  externalIdEvento: number | null;
  aprovacao: number | null;
  votosSim: number | null;
  votosNao: number | null;
  votosOutros: number | null;
  descricao: string | null;
  ultimaAberturaVotacaoDataHoraRegistro: string | null;
  ultimaAberturaVotacaoDescricao: string | null;
  ultimaApresentacaoProposicaoDataHoraRegistro: string | null;
  ultimaApresentacaoProposicaoDescricao: string | null;
  externalIdProposicaoUltimaApresentacao: number | null;
  uriProposicaoUltimaApresentacao: string | null;
};

export type VotacaoUpsertResult = {
  inserted: number;
  updated: number;
};

export type VotacaoRepository = {
  upsert(rows: readonly VotacaoRow[]): Promise<VotacaoUpsertResult>;
};
