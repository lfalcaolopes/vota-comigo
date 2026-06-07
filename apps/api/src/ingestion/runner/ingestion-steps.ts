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
import { createVotacaoVotosRepository } from './steps/votacao-votos/votacao-votos.repository';
import { createDeputadoLookup } from './steps/votacao-votos/lookups';
import { createVotacaoVotosStep } from './steps/votacao-votos/votacao-votos.step';
import type {
  DeputadoLookup,
  VotacaoVotosRepository,
} from './steps/votacao-votos/votacao-votos.repository.types';
import { createProposicaoRepository } from './steps/proposicoes/proposicoes.repository';
import { createProposicoesStep } from './steps/proposicoes/proposicoes.step';
import { createFonteDerivadaProposicoesAfetadas } from './steps/proposicoes/fonte-derivada-proposicoes-afetadas';
import {
  createDatasetDownloader,
  type DatasetDownloader,
} from './shared/dataset-downloader';
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
import { createTemaRepository } from './steps/tema/tema.repository';
import { createTemaLookup } from './steps/tema/tema.lookups';
import { createTemaStep } from './steps/tema/tema.step';
import type {
  TemaLookup,
  TemaRepository,
} from './steps/tema/tema.repository.types';
import { createSanityRepository } from './steps/sanity/sanity.repository';
import { createSanityStep } from './steps/sanity/sanity.step';
import type { SanityRepository } from './steps/sanity/sanity.repository.types';
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

const dryRunVotacaoVotosRepository: VotacaoVotosRepository = {
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
const dryRunProposicaoDownloader: DatasetDownloader = {
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

const dryRunDeputadoLookup: DeputadoLookup = {
  loadIdByExternalId: () => Promise.resolve(new Map<number, string>()),
};

const dryRunTemaRepository: TemaRepository = {
  upsertTemas: dryRunWriteGuard,
  upsertVinculos: dryRunWriteGuard,
};

const dryRunTemaLookup: TemaLookup = {
  loadIdByExternalCodTema: () => Promise.resolve(new Map<number, string>()),
};

const dryRunLegislaturaLookup: LegislaturaLookup = {
  loadIdByExternalId(): Promise<never> {
    throw new Error(
      'Lookup de legislatura acionado em dry-run. Nenhuma resolução de FK deveria ocorrer.',
    );
  },
};

// O passo sanity faz short-circuit em dry-run; o guard só protege o contrato
// caso essa garantia seja quebrada.
const dryRunSanityRepository: SanityRepository = {
  loadPlacares: dryRunReadGuard,
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
    const fonteDerivada = createFonteDerivadaProposicoesAfetadas({
      proposicoesDownloader: dryRunProposicaoDownloader,
      temasDownloader: dryRunProposicaoDownloader,
    });

    return Promise.resolve({
      steps: [
        createLegislaturasStep(dryRunLegislaturaRepository),
        createDeputadosStep(dryRunDeputadoRepository, dryRunLegislaturaLookup),
        createPartidosStep(dryRunPartidoRepository),
        createVotacoesStep(dryRunVotacaoRepository),
        createVotacaoVotosStep({
          repository: dryRunVotacaoVotosRepository,
          votacaoLookup: dryRunVotacaoLookup,
          deputadoLookup: dryRunDeputadoLookup,
        }),
        createProposicoesStep({
          repository: dryRunProposicaoRepository,
          fonteDerivada,
        }),
        createVotacaoProposicaoStep({
          repository: dryRunVotacaoProposicaoRepository,
          votacaoLookup: dryRunVotacaoLookup,
          proposicaoLookup: dryRunProposicaoLookup,
        }),
        createTemaStep({
          repository: dryRunTemaRepository,
          fonteDerivada,
          proposicaoLookup: dryRunProposicaoLookup,
          temaLookup: dryRunTemaLookup,
        }),
        createDeputadoHistoricoStep(dryRunHistoricoDeps),
        createSanityStep(dryRunSanityRepository),
      ],
      close: () => Promise.resolve(),
    });
  }

  const factory = options.databaseClientFactory ?? createDatabaseClient;
  const { db, close } = factory();
  const fonteDerivada = createFonteDerivadaProposicoesAfetadas({
    proposicoesDownloader: createDatasetDownloader('proposicoes'),
    temasDownloader: createDatasetDownloader('proposicoesTemas'),
  });

  const steps: IngestionStep[] = [
    createLegislaturasStep(createLegislaturaRepository(db)),
    createDeputadosStep(
      createDeputadoRepository(db),
      createLegislaturaLookup(db),
    ),
    createPartidosStep(createPartidoRepository(db)),
    createVotacoesStep(createVotacaoRepository(db)),
    createVotacaoVotosStep({
      repository: createVotacaoVotosRepository(db),
      votacaoLookup: createVotacaoLookup(db),
      deputadoLookup: createDeputadoLookup(db),
    }),
    createProposicoesStep({
      repository: createProposicaoRepository(db),
      fonteDerivada,
    }),
    createVotacaoProposicaoStep({
      repository: createVotacaoProposicaoRepository(db),
      votacaoLookup: createVotacaoLookup(db),
      proposicaoLookup: createProposicaoLookup(db),
    }),
    createTemaStep({
      repository: createTemaRepository(db),
      fonteDerivada,
      proposicaoLookup: createProposicaoLookup(db),
      temaLookup: createTemaLookup(db),
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
    createSanityStep(createSanityRepository(db)),
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
