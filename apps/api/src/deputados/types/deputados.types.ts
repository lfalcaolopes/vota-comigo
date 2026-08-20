import type {
  ComparativoCota,
  DeputadoFeedSort,
  DeputadoFaixaEtaria,
  DeputadoSexo,
  UsoCotaResumo,
} from '@vota-comigo/shared-types';

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

export type LegislaturaSource = {
  externalIdLegislatura: number;
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
    sigepaReposto: boolean;
    sigepaCoveredThroughMonth: number | null;
  }[];
  gasto: {
    siglaUf: string;
    gastosJson: Record<string, Record<string, number>>;
  } | null;
  // Espelho do dump e reposição chegam separados: quem mescla é o módulo da
  // janela, na leitura (ADR 022).
  gastosSigepaJson: Record<string, number> | null;
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

export type DeputadoProposicoesAssinadasJanelaSource = {
  anos: readonly {
    year: number;
    coberto: boolean;
    assinaturasJson: Record<string, ContadorAssinaturas> | null;
  }[];
  coveredThroughDate: string | null;
};

// A UF é uma só para a janela inteira — a do ano mais recente com linha de
// gasto —, porque a comparação contra a mediana precisa de um estado, e o
// deputado que mudou de UF não tem duas medianas somáveis.
export type CoberturaCotaMensalRow = {
  year: number;
  coveredThroughMonth: number;
};

// Materializada por deputado na ingestão: a legislatura acompanha a comparação
// porque uma janela recalculada em runtime pode já ter virado de legislatura.
export type CotaComparacaoRow = {
  legislatura: number;
  cota: ComparativoCota;
};

export type DeputadoCotaJanelaSource = {
  siglaUf: string | null;
  anos: readonly {
    year: number;
    coveredThroughMonth: number | null;
    gastosJson: Record<string, Record<string, number>> | null;
    sigepaReposto: boolean;
    sigepaCoveredThroughMonth: number | null;
    // Espelho do dump e reposição chegam separados: quem mescla é o módulo da
    // janela, na leitura (ADR 022).
    gastosSigepaJson: Record<string, number> | null;
    medianaUf: {
      amountUsedCents: number;
      deputadoCount: number;
    } | null;
  }[];
  intervalosExercicio: readonly IntervaloExercicio[];
  datasInicioLegislatura: readonly string[];
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
  usoCota: UsoCotaResumo;
};

export type DeputadosFeedFilters = {
  readonly sort?: DeputadoFeedSort;
  readonly q?: string;
  readonly emAtividade?: boolean;
  readonly ufs?: readonly string[];
  readonly partidos?: readonly string[];
  readonly sexo?: DeputadoSexo;
  readonly faixasEtarias?: readonly DeputadoFaixaEtaria[];
};

export type DeputadosFeedPagination = {
  readonly limit: number;
  readonly offset: number;
};

export type DeputadosFeedPage = {
  readonly items: readonly DeputadoCardRow[];
  readonly total: number;
};
