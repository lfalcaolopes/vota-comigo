import type { VotoCategoria } from '@vota-comigo/shared-types';

export type DeputadoHistoricoEventoSource = {
  dataHora: string;
  situacao: string | null;
  descricaoStatus: string;
  nomeEleitoral: string | null;
  siglaPartido: string | null;
  siglaUf: string | null;
  urlFoto: string | null;
};

export type DeputadoLegislaturaPeriodoSource = {
  dataInicio: string;
  dataFim: string;
};

export type DeputadoPerfilSource = {
  id: string;
  externalIdDeputado: number;
  nome: string | null;
  nomeCivil: string | null;
  dataNascimento: string | null;
  municipioNascimento: string | null;
  ufNascimento: string | null;
  urlRedeSocial: string | null;
  externalIdLegislaturaInicial: number | null;
  externalIdLegislaturaFinal: number | null;
  legislaturaInicialPeriodo: DeputadoLegislaturaPeriodoSource | null;
  legislaturaFinalPeriodo: DeputadoLegislaturaPeriodoSource | null;
  eventos: readonly DeputadoHistoricoEventoSource[];
};

export type VotacaoProposicaoComputavelRow = {
  dataHoraRegistro: string | null;
  data: string | null;
  voto: VotoCategoria | null;
};
