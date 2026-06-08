import type { DatasetDownloader } from '../shared/dataset-downloader';
import type { DeputadoHistoricoStepDeps } from '../steps/deputado-historico/deputado-historico.step';
import type {
  DeputadoRepository,
  LegislaturaLookup,
} from '../steps/deputados/deputados.repository.types';
import type { LegislaturaRepository } from '../steps/legislaturas/legislaturas.repository.types';
import type { PartidoRepository } from '../steps/partidos/partidos.repository.types';
import type { ProposicaoRepository } from '../steps/proposicoes/proposicoes.repository.types';
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

export const dryRunSanityRepository: SanityRepository = {
  loadPlacares: dryRunReadGuard,
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
