import {
  createDatabaseClient,
  type DatabaseClient,
} from '@/shared/database/client';
import { createLegislaturaRepository } from '../steps/legislaturas/legislaturas.repository';
import { createLegislaturasStep } from '../steps/legislaturas/legislaturas.step';
import {
  createDeputadoRepository,
  createLegislaturaLookup,
} from '../steps/deputados/deputados.repository';
import { createDeputadosStep } from '../steps/deputados/deputados.step';
import { createPartidoRepository } from '../steps/partidos/partidos.repository';
import { createPartidosStep } from '../steps/partidos/partidos.step';
import {
  createDeputadoHistoricoRepository,
  createDeputadoSource,
  createPartidoLookup,
} from '../steps/deputado-historico/deputado-historico.repository';
import { createDeputadoHistoricoStep } from '../steps/deputado-historico/deputado-historico.step';
import { createVotacaoRepository } from '../steps/votacoes/votacoes.repository';
import { createVotacoesStep } from '../steps/votacoes/votacoes.step';
import { createVotacaoVotosRepository } from '../steps/votacao-votos/votacao-votos.repository';
import { createDeputadoLookup } from '../steps/votacao-votos/lookups';
import { createVotacaoVotosStep } from '../steps/votacao-votos/votacao-votos.step';
import { createProposicaoRepository } from '../steps/proposicoes/proposicoes.repository';
import { createProposicoesStep } from '../steps/proposicoes/proposicoes.step';
import { createFonteDerivadaProposicoesAfetadas } from '../steps/proposicoes/fonte-derivada-proposicoes-afetadas';
import { createDatasetDownloader } from '../shared/dataset-downloader';
import { createVotacaoProposicaoRepository } from '../steps/votacao-proposicao/votacao-proposicao.repository';
import {
  createProposicaoLookup,
  createVotacaoLookup,
} from '../steps/votacao-proposicao/lookups';
import { createVotacaoProposicaoStep } from '../steps/votacao-proposicao/votacao-proposicao.step';
import { createProposicaoComputavelRepository } from '../steps/proposicao-computavel/proposicao-computavel.repository';
import { createProposicaoComputavelStep } from '../steps/proposicao-computavel/proposicao-computavel.step';
import { createTemaRepository } from '../steps/tema/tema.repository';
import { createTemaLookup } from '../steps/tema/tema.lookups';
import { createTemaStep } from '../steps/tema/tema.step';
import { createSanityRepository } from '../steps/sanity/sanity.repository';
import { createSanityStep } from '../steps/sanity/sanity.step';
import { createDeputadoHistoricoClient } from '../shared/camara-historico-client';
import { fetchCamaraJson } from '../shared/camara-api-transport';
import {
  dryRunDeputadoLookup,
  dryRunDeputadoRepository,
  dryRunHistoricoDeps,
  dryRunLegislaturaLookup,
  dryRunLegislaturaRepository,
  dryRunPartidoRepository,
  dryRunProposicaoDownloader,
  dryRunProposicaoComputavelRepository,
  dryRunProposicaoLookup,
  dryRunProposicaoRepository,
  dryRunSanityRepository,
  dryRunTemaLookup,
  dryRunTemaRepository,
  dryRunVotacaoLookup,
  dryRunVotacaoProposicaoRepository,
  dryRunVotacaoRepository,
  dryRunVotacaoVotosRepository,
} from './dry-run-deps';
import type {
  CreateStepsInput,
  CreateStepsResult,
  IngestionStep,
} from '../types/ingestion-pipeline-runner.types';

export type IngestionStepsOptions = {
  databaseClientFactory?: (url?: string) => DatabaseClient;
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
        createProposicaoComputavelStep(dryRunProposicaoComputavelRepository),
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
    createProposicaoComputavelStep(createProposicaoComputavelRepository(db)),
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
