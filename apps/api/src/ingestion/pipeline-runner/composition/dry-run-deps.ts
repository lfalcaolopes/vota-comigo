import type { DatasetDownloader } from '../shared/dataset-downloader';
import type { DeputadoGastoCotaSigepaStepDeps } from '../steps/deputado-gasto-cota-sigepa/deputado-gasto-cota-sigepa.step';
import type { DeputadoHistoricoStepDeps } from '../steps/deputado-historico/deputado-historico.step';
import type {
  DeputadoRepository,
  LegislaturaLookup,
} from '../steps/deputados/deputados.repository.types';
import type { LegislaturaRepository } from '../steps/legislaturas/legislaturas.repository.types';
import type { PartidoRepository } from '../steps/partidos/partidos.repository.types';
import type { ProposicaoRepository } from '../steps/proposicoes/proposicoes.repository.types';
import type { ProposicaoComputavelRepository } from '../steps/proposicao-computavel/proposicao-computavel.repository.types';
import type { DeputadoPresencaRepository } from '../steps/deputado-presenca/deputado-presenca.repository.types';
import type { DeputadoExercicioIntervaloRepository } from '../steps/deputado-exercicio-intervalo/deputado-exercicio-intervalo.repository.types';
import type { DeputadoGastoCotaRepository } from '../steps/deputado-gasto-cota/deputado-gasto-cota.repository.types';
import type { OrgaoRepository } from '../steps/orgaos/orgaos.repository.types';
import type { DeputadoOrgaoRepository } from '../steps/deputado-orgao/deputado-orgao.repository.types';
import type { DeputadoProposicaoAssinadaRepository } from '../steps/deputado-proposicao-assinada/deputado-proposicao-assinada.repository.types';
import type { CotaMedianaUfRepository } from '../steps/cota-mediana-uf/cota-mediana-uf.repository.types';
import type { SanityRepository } from '../steps/sanity/sanity.repository.types';
import type {
  TemaLookup,
  TemaRepository,
} from '../steps/tema/tema.repository.types';
import type {
  ProposicaoLookup,
  VotacaoLookup,
  VotacaoProposicaoRepository,
} from '../steps/votacao-proposicao/votacao-proposicao.repository.types';
import type {
  DeputadoLookup,
  VotacaoVotosRepository,
} from '../steps/votacao-votos/votacao-votos.repository.types';
import type { VotacaoRepository } from '../steps/votacoes/votacoes.repository.types';

export const dryRunLegislaturaRepository: LegislaturaRepository = {
  upsert: dryRunWriteGuard,
};

export const dryRunDeputadoRepository: DeputadoRepository = {
  upsert: dryRunWriteGuard,
};

export const dryRunPartidoRepository: PartidoRepository = {
  upsert: dryRunWriteGuard,
};

export const dryRunOrgaoRepository: OrgaoRepository = {
  upsert: dryRunWriteGuard,
};

export const dryRunDeputadoOrgaoRepository: DeputadoOrgaoRepository = {
  loadDeputadoIdByExternalId: () => Promise.resolve(new Map()),
  loadLegislaturaIdByExternalId: () => Promise.resolve(new Map()),
  loadOrgaoIdByExternalId: () => Promise.resolve(new Map()),
  replaceLegislatura: dryRunWriteGuard,
};

export const dryRunDeputadoProposicaoAssinadaRepository: DeputadoProposicaoAssinadaRepository =
  {
    loadDeputadoIdByExternalId: () => Promise.resolve(new Map()),
    upsertTipos: dryRunWriteGuard,
    replaceAno: dryRunWriteGuard,
  };

export const dryRunVotacaoRepository: VotacaoRepository = {
  upsert: dryRunWriteGuard,
};

export const dryRunVotacaoVotosRepository: VotacaoVotosRepository = {
  upsert: dryRunWriteGuard,
};

export const dryRunProposicaoRepository: ProposicaoRepository = {
  upsert: dryRunWriteGuard,
};

export const dryRunVotacaoProposicaoRepository: VotacaoProposicaoRepository = {
  upsert: dryRunWriteGuard,
};

export const dryRunProposicaoComputavelRepository: ProposicaoComputavelRepository =
  {
    loadCandidates: () => Promise.resolve([]),
    fullReplace: dryRunWriteGuard,
  };

export const dryRunProposicaoDownloader: DatasetDownloader = {
  download: dryRunReadGuard,
};

export const dryRunVotacaoLookup: VotacaoLookup = {
  loadIdByExternalId: () => Promise.resolve(new Map<string, string>()),
};

export const dryRunProposicaoLookup: ProposicaoLookup = {
  loadIdByExternalId: () => Promise.resolve(new Map<number, string>()),
};

export const dryRunDeputadoLookup: DeputadoLookup = {
  loadIdByExternalId: () => Promise.resolve(new Map<number, string>()),
};

export const dryRunTemaRepository: TemaRepository = {
  upsertTemas: dryRunWriteGuard,
  upsertVinculos: dryRunWriteGuard,
};

export const dryRunTemaLookup: TemaLookup = {
  loadIdByExternalCodTema: () => Promise.resolve(new Map<number, string>()),
};

export const dryRunLegislaturaLookup: LegislaturaLookup = {
  loadIdByExternalId(): Promise<never> {
    throw new Error(
      'Lookup de legislatura acionado em dry-run. Nenhuma resolução de FK deveria ocorrer.',
    );
  },
};

export const dryRunDeputadoPresencaRepository: DeputadoPresencaRepository = {
  loadDeputadosComHistorico: () => Promise.resolve([]),
  loadComputableVotacoes: () => Promise.resolve([]),
  loadLegislaturas: () => Promise.resolve([]),
  fullReplace: dryRunWriteGuard,
};

export const dryRunDeputadoExercicioIntervaloRepository: DeputadoExercicioIntervaloRepository =
  {
    loadDeputadosComHistorico: () => Promise.resolve([]),
    fullReplace: dryRunWriteGuard,
  };

export const dryRunDeputadoGastoCotaRepository: DeputadoGastoCotaRepository = {
  loadDeputadoIdByExternalId: () => Promise.resolve(new Map()),
  replaceAno: dryRunWriteGuard,
};

export const dryRunCotaMedianaUfRepository: CotaMedianaUfRepository = {
  loadAnosComCobertura: () => Promise.resolve([]),
  loadDatasInicioLegislatura: () => Promise.resolve([]),
  loadGastosAnuais: () => Promise.resolve([]),
  loadIntervalosByDeputadoId: () => Promise.resolve(new Map()),
  replaceAno: dryRunWriteGuard,
};

export const dryRunSanityRepository: SanityRepository = {
  loadPlacares: dryRunReadGuard,
};

export const dryRunGastoCotaSigepaDeps: DeputadoGastoCotaSigepaStepDeps = {
  repository: {
    loadDeputadosSemReposicao: dryRunReadGuard,
    loadDeputadosElegiveis: dryRunReadGuard,
    loadLegislaturas: dryRunReadGuard,
    loadCobertura: dryRunReadGuard,
    saveAnoReposto: dryRunWriteGuard,
    upsert: dryRunWriteGuard,
  },
  despesasClient: { fetch: dryRunReadGuard },
};

export const dryRunHistoricoDeps: DeputadoHistoricoStepDeps = {
  deputadoSource: { loadIngested: dryRunReadGuard },
  historicoClient: { fetch: dryRunReadGuard },
  legislaturaLookup: { loadIdByExternalId: dryRunReadGuard },
  partidoLookup: { loadIdByExternalId: dryRunReadGuard },
  partidoRepository: { upsert: dryRunWriteGuard },
  historicoRepository: { upsert: dryRunWriteGuard },
};

function dryRunReadGuard(): Promise<never> {
  throw new Error(
    'Dependência de leitura acionada em dry-run. O passo de histórico deveria ter feito short-circuit.',
  );
}

function dryRunWriteGuard(): Promise<never> {
  throw new Error(
    'Repositório de escrita acionado em dry-run. Nenhuma gravação deveria ocorrer.',
  );
}
