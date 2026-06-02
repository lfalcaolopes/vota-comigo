import {
  createDatabaseClient,
  type DatabaseClient,
} from '@/shared/database/client';
import { createLegislaturaRepository } from './steps/legislaturas/legislaturas.repository';
import { createLegislaturasStep } from './steps/legislaturas/legislaturas.step';
import type { LegislaturaRepository } from './steps/legislaturas/legislaturas.repository.types';
import {
  createDeputadoRepository,
  createLegislaturaLookup,
} from './steps/deputados/deputados.repository';
import { createDeputadosStep } from './steps/deputados/deputados.step';
import type {
  DeputadoRepository,
  LegislaturaLookup,
} from './steps/deputados/deputados.repository.types';
import { createPartidoRepository } from './steps/partidos/partidos.repository';
import { createPartidosStep } from './steps/partidos/partidos.step';
import type { PartidoRepository } from './steps/partidos/partidos.repository.types';
import {
  createDeputadoHistoricoRepository,
  createDeputadoSource,
  createPartidoLookup,
} from './steps/deputado-historico/deputado-historico.repository';
import { createDeputadoHistoricoStep } from './steps/deputado-historico/deputado-historico.step';
import type { DeputadoHistoricoStepDeps } from './steps/deputado-historico/deputado-historico.step';
import { createVotacaoRepository } from './steps/votacoes/votacoes.repository';
import { createVotacoesStep } from './steps/votacoes/votacoes.step';
import type { VotacaoRepository } from './steps/votacoes/votacoes.repository.types';
import { createProposicaoRepository } from './steps/proposicoes/proposicoes.repository';
import { createProposicoesStep } from './steps/proposicoes/proposicoes.step';
import { createProposicaoDownloader } from './steps/proposicoes/proposicoes.downloader';
import type { ProposicaoDownloader } from './steps/proposicoes/proposicoes.step';
import type { ProposicaoRepository } from './steps/proposicoes/proposicoes.repository.types';
import { createVotacaoProposicaoRepository } from './steps/votacao-proposicao/votacao-proposicao.repository';
import {
  createProposicaoLookup,
  createVotacaoLookup,
} from './steps/votacao-proposicao/lookups';
import { createVotacaoProposicaoStep } from './steps/votacao-proposicao/votacao-proposicao.step';
import type {
  ProposicaoLookup,
  VotacaoLookup,
  VotacaoProposicaoRepository,
} from './steps/votacao-proposicao/votacao-proposicao.repository.types';
import { createDeputadoHistoricoClient } from './shared/camara-historico-client';
import { fetchCamaraJson } from './shared/camara-api-transport';
import type {
  CreateStepsInput,
  CreateStepsResult,
  IngestionStep,
} from './ingestion-runner.types';

export type IngestionStepsOptions = {
  databaseClientFactory?: (url?: string) => DatabaseClient;
};

const dryRunLegislaturaRepository: LegislaturaRepository = {
  upsert: dryRunWriteGuard,
};

const dryRunDeputadoRepository: DeputadoRepository = {
  upsert: dryRunWriteGuard,
};

const dryRunPartidoRepository: PartidoRepository = {
  upsert: dryRunWriteGuard,
};

const dryRunVotacaoRepository: VotacaoRepository = {
  upsert: dryRunWriteGuard,
};

const dryRunProposicaoRepository: ProposicaoRepository = {
  upsert: dryRunWriteGuard,
};

const dryRunVotacaoProposicaoRepository: VotacaoProposicaoRepository = {
  upsert: dryRunWriteGuard,
};

// O passo proposicoes faz short-circuit do download em dry-run; o guard apenas
// garante que nenhuma rede seja acionada caso esse contrato seja quebrado.
const dryRunProposicaoDownloader: ProposicaoDownloader = {
  download: dryRunReadGuard,
};

// Lookups vazios mantêm o dry-run sem tocar o banco: o passo ainda parseia e
// valida cada linha, sem resolver FKs reais.
const dryRunVotacaoLookup: VotacaoLookup = {
  loadIdByExternalId: () => Promise.resolve(new Map<string, string>()),
};

const dryRunProposicaoLookup: ProposicaoLookup = {
  loadIdByExternalId: () => Promise.resolve(new Map<number, string>()),
};

const dryRunLegislaturaLookup: LegislaturaLookup = {
  loadIdByExternalId(): Promise<never> {
    throw new Error(
      'Lookup de legislatura acionado em dry-run. Nenhuma resolução de FK deveria ocorrer.',
    );
  },
};

const dryRunHistoricoDeps: DeputadoHistoricoStepDeps = {
  deputadoSource: { loadIngested: dryRunReadGuard },
  historicoClient: { fetch: dryRunReadGuard },
  legislaturaLookup: { loadIdByExternalId: dryRunReadGuard },
  partidoLookup: { loadIdByExternalId: dryRunReadGuard },
  partidoRepository: { upsert: dryRunWriteGuard },
  historicoRepository: { upsert: dryRunWriteGuard },
};

export function createIngestionSteps(
  input: CreateStepsInput,
  options: IngestionStepsOptions = {},
): Promise<CreateStepsResult> {
  if (input.dryRun) {
    return Promise.resolve({
      steps: [
        createLegislaturasStep(dryRunLegislaturaRepository),
        createDeputadosStep(dryRunDeputadoRepository, dryRunLegislaturaLookup),
        createPartidosStep(dryRunPartidoRepository),
        createVotacoesStep(dryRunVotacaoRepository),
        createProposicoesStep({
          repository: dryRunProposicaoRepository,
          downloader: dryRunProposicaoDownloader,
        }),
        createVotacaoProposicaoStep({
          repository: dryRunVotacaoProposicaoRepository,
          votacaoLookup: dryRunVotacaoLookup,
          proposicaoLookup: dryRunProposicaoLookup,
        }),
        createDeputadoHistoricoStep(dryRunHistoricoDeps),
      ],
      close: () => Promise.resolve(),
    });
  }

  const factory = options.databaseClientFactory ?? createDatabaseClient;
  const { db, close } = factory();

  const steps: IngestionStep[] = [
    createLegislaturasStep(createLegislaturaRepository(db)),
    createDeputadosStep(
      createDeputadoRepository(db),
      createLegislaturaLookup(db),
    ),
    createPartidosStep(createPartidoRepository(db)),
    createVotacoesStep(createVotacaoRepository(db)),
    createProposicoesStep({
      repository: createProposicaoRepository(db),
      downloader: createProposicaoDownloader(),
    }),
    createVotacaoProposicaoStep({
      repository: createVotacaoProposicaoRepository(db),
      votacaoLookup: createVotacaoLookup(db),
      proposicaoLookup: createProposicaoLookup(db),
    }),
    createDeputadoHistoricoStep({
      deputadoSource: createDeputadoSource(db, {
        onlyExternalIds: input.retryExternalIds,
        refetchHistorico: input.refetchHistorico,
      }),
      historicoClient: createDeputadoHistoricoClient({
        transport: fetchCamaraJson,
      }),
      legislaturaLookup: createLegislaturaLookup(db),
      partidoLookup: createPartidoLookup(db),
      partidoRepository: createPartidoRepository(db),
      historicoRepository: createDeputadoHistoricoRepository(db),
    }),
  ];

  return Promise.resolve({ steps, close });
}

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
