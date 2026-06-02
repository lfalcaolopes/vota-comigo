import type {
  ExternalGap,
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../ingestion-runner.types';
import { StrictModeError } from '../../strict-mode-error';
import { collectNeededProposicoes } from './needed-proposicoes';
import { toProposicaoRow } from './proposicoes.transformer';
import type {
  ProposicaoRepository,
  ProposicaoRow,
} from './proposicoes.repository.types';
import type {
  DatasetDownloader,
  DatasetDownloadOutcome,
} from '../../shared/dataset-downloader';

export type ProposicaoDownloadOutcome = DatasetDownloadOutcome;

export type ProposicaoDownloader = DatasetDownloader;

export type ProposicoesStepDeps = {
  repository: ProposicaoRepository;
  downloader: ProposicaoDownloader;
};

export function createProposicoesStep(
  deps: ProposicoesStepDeps,
): IngestionStep {
  return {
    name: 'proposicoes',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const readDataset = context.readDataset;

      if (readDataset === undefined) {
        throw new Error(
          'Passo proposicoes requer readDataset no contexto de execução.',
        );
      }

      const { neededByYear } = await collectNeededProposicoes({
        years: context.years ?? [],
        limit: context.limit,
        readDataset,
      });

      const neededYears = [...neededByYear.keys()];

      await ensureProposicaoFiles(context, neededYears, deps.downloader);

      const rows: ProposicaoRow[] = [];
      const externalGaps: ExternalGap[] = [];
      let read = 0;

      for (const year of neededYears) {
        const neededIds = neededByYear.get(year)!;
        const yearSource = readDataset('proposicoes', year);

        if (yearSource === undefined) {
          externalGaps.push(missingFileGap(year));
          continue;
        }

        const found = new Set<number>();

        for await (const { record } of yearSource()) {
          const externalId = Number(record.id);

          if (!neededIds.has(externalId)) {
            continue;
          }

          found.add(externalId);
          rows.push(toProposicaoRow(record));
          read += 1;
        }

        for (const externalId of neededIds) {
          if (found.has(externalId)) {
            continue;
          }

          const gap = missingProposicaoGap(year, externalId);

          if (context.strict && !context.dryRun) {
            throw StrictModeError.fromGap(gap);
          }

          externalGaps.push(gap);
        }
      }

      const { inserted, updated } = context.dryRun
        ? { inserted: 0, updated: 0 }
        : await deps.repository.upsert(rows);

      return {
        read,
        inserted,
        updated,
        ignored: 0,
        rejected: [],
        externalGaps,
      };
    },
  };
}

async function ensureProposicaoFiles(
  context: IngestionStepContext,
  neededYears: readonly number[],
  downloader: ProposicaoDownloader,
): Promise<void> {
  if (context.dryRun) {
    return;
  }

  const missingYears = neededYears.filter(
    (year) => context.readDataset!('proposicoes', year) === undefined,
  );

  if (missingYears.length === 0) {
    return;
  }

  const outcome = await downloader.download(missingYears);

  if (!outcome.ok) {
    const failedYears = outcome.failures.map((failure) => failure.year);
    const gap: ExternalGap = {
      file: 'proposicoes',
      type: 'download_falhou',
      reference: failedYears.join(','),
      message:
        `Falha ao baixar proposicoes-{ano}.csv: ${describeFailures(outcome.failures)}. ` +
        `Faltam os anos ${failedYears.join(', ')}. ` +
        `Retome com: npm run ingest -- --only=proposicoes,votacao_proposicao após restabelecer o acesso à fonte.`,
    };

    throw StrictModeError.fromGap(gap);
  }
}

function describeFailures(
  failures: readonly { year: number; reason: string }[],
): string {
  return failures
    .map((failure) => `${failure.year} (${failure.reason})`)
    .join('; ');
}

function missingFileGap(year: number): ExternalGap {
  return {
    file: `proposicoes-${year}.csv`,
    type: 'fonte_ausente',
    reference: `proposicoes-${year}`,
    message: `proposicoes-${year}.csv ausente em disco; proposições do ano ${year} não foram ingeridas.`,
  };
}

function missingProposicaoGap(year: number, externalId: number): ExternalGap {
  return {
    file: `proposicoes-${year}.csv`,
    type: 'proposicao_ausente',
    reference: String(externalId),
    message: `Proposição ${externalId} necessária não encontrada em proposicoes-${year}.csv; lacuna registrada sem registro sintético.`,
  };
}
