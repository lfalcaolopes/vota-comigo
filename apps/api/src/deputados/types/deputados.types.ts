import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

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

export type DeputadoResumoPresencaRow = {
  presencas: number;
  ausenciasSemMotivoConhecido: number;
};

export type DeputadoCeapSource = {
  coberturas: readonly {
    year: number;
    coveredThroughMonth: number;
  }[];
  gasto: {
    siglaUf: string;
    gastosJson: Record<string, Record<string, number>>;
  } | null;
  categorias: readonly {
    externalNumSubCota: number;
    description: string;
  }[];
  medianaUf: {
    amountUsedCents: number;
    deputadoCount: number;
  } | null;
  intervalosExercicio: readonly IntervaloExercicio[];
  datasInicioLegislatura: readonly string[];
};

export type ContadorAssinaturas = readonly [
  assinadas: number,
  primeiras: number,
];

export type DeputadoProposicoesAssinadasSource = {
  anoCoberto: boolean;
  assinaturasJson: Record<string, ContadorAssinaturas> | null;
  coveredThroughDate: string | null;
};

export type DeputadoOrgaoSource = {
  externalIdOrgao: number;
  siglaOrgao: string | null;
  nome: string | null;
  titulo: string | null;
  dataInicio: string;
  dataFim: string | null;
};

export type DeputadoCardRow = {
  externalIdDeputado: number;
  nomePublico: string | null;
  nomeCivil: string | null;
  siglaPartido: string | null;
  siglaUf: string | null;
  urlFoto: string | null;
  emAtividade: boolean;
};

export type DeputadosFeedFilters = {
  readonly q?: string;
  readonly emAtividade?: boolean;
  readonly uf?: string;
  readonly partido?: string;
};

export type DeputadosFeedPagination = {
  readonly limit: number;
  readonly offset: number;
};

export type DeputadosFeedPage = {
  readonly items: readonly DeputadoCardRow[];
  readonly total: number;
};
