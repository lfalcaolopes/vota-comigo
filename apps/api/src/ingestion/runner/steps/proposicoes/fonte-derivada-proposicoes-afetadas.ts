import type {
  CsvRowSource,
  ExternalGap,
  IngestionReporter,
} from '../../ingestion-runner.types';
import type { DatasetDownloader } from '../../shared/dataset-downloader';
import { StrictModeError } from '../../strict-mode-error';
import {
  collectNeededProposicoes,
  type NeededProposicoes,
} from './needed-proposicoes';

const PROPOSICOES_DATASET = 'proposicoes';
const TEMAS_DATASET = 'proposicoesTemas';

export type FonteDerivadaProposicoesAfetadasOptions = {
  years: readonly number[];
  limit?: number;
  canDownload: boolean;
  strict: boolean;
  reporter?: Pick<IngestionReporter, 'log'>;
  readDataset(dataset: string, year: number): CsvRowSource | undefined;
};

export type PreparedProposicoes = NeededProposicoes & {
  externalGaps: readonly ExternalGap[];
};

export type FonteDerivadaProposicoesAfetadas = {
  prepareProposicoes(
    options: FonteDerivadaProposicoesAfetadasOptions,
  ): Promise<PreparedProposicoes>;
  prepareTemas(
    options: FonteDerivadaProposicoesAfetadasOptions,
  ): Promise<PreparedProposicoes>;
};

export type FonteDerivadaProposicoesAfetadasDeps = {
  proposicoesDownloader: DatasetDownloader;
  temasDownloader: DatasetDownloader;
};

type EnsureDatasetFilesInput = {
  dataset: string;
  neededYears: readonly number[];
  canDownload: boolean;
  reporter?: Pick<IngestionReporter, 'log'>;
  readDataset(dataset: string, year: number): CsvRowSource | undefined;
  downloader: DatasetDownloader;
  logMessage: string;
  resumeCommand: string;
  missingFileGap(year: number): ExternalGap;
};

export function createFonteDerivadaProposicoesAfetadas(
  deps: FonteDerivadaProposicoesAfetadasDeps,
): FonteDerivadaProposicoesAfetadas {
  return {
    async prepareProposicoes(options): Promise<PreparedProposicoes> {
      const { neededByYear } = await collectNeededProposicoes(options);
      const neededYears = [...neededByYear.keys()];
      const neededTotal = [...neededByYear.values()].reduce(
        (total, ids) => total + ids.size,
        0,
      );
      const externalGaps: ExternalGap[] = [];

      options.reporter?.log(
        `[proposicoes] ${neededTotal} proposições necessárias em ${neededYears.length} ano(s)`,
      );

      externalGaps.push(
        ...(await ensureDatasetFiles({
          dataset: PROPOSICOES_DATASET,
          neededYears,
          canDownload: options.canDownload,
          reporter: options.reporter,
          readDataset: (dataset, year) => options.readDataset(dataset, year),
          downloader: deps.proposicoesDownloader,
          logMessage: `[proposicoes] baixando proposicoes-{ano}.csv ausentes`,
          resumeCommand:
            'npm run ingest -- --only=proposicoes,votacao_proposicao',
          missingFileGap: missingProposicoesFileGap,
        })),
      );

      for (const [year, neededIds] of neededByYear) {
        const yearSource = options.readDataset(PROPOSICOES_DATASET, year);

        if (yearSource === undefined) {
          continue;
        }

        const found = new Set<number>();

        for await (const { record } of yearSource()) {
          const externalId = Number(record.id);

          if (neededIds.has(externalId)) {
            found.add(externalId);
          }
        }

        for (const externalId of neededIds) {
          if (found.has(externalId)) {
            continue;
          }

          const gap = missingProposicaoGap(year, externalId);

          if (options.strict && options.canDownload) {
            throw StrictModeError.fromGap(gap);
          }

          externalGaps.push(gap);
        }
      }

      return { neededByYear, externalGaps };
    },

    async prepareTemas(options): Promise<PreparedProposicoes> {
      const { neededByYear } = await collectNeededProposicoes(options);
      const neededYears = [...neededByYear.keys()];

      options.reporter?.log(
        `[tema] temas necessários para proposições de ${neededYears.length} ano(s)`,
      );

      const externalGaps = await ensureDatasetFiles({
        dataset: TEMAS_DATASET,
        neededYears,
        canDownload: options.canDownload,
        reporter: options.reporter,
        readDataset: (dataset, year) => options.readDataset(dataset, year),
        downloader: deps.temasDownloader,
        logMessage: `[tema] baixando ${TEMAS_DATASET}-{ano}.csv ausentes`,
        resumeCommand: 'npm run ingest -- --only=tema',
        missingFileGap: missingTemaFileGap,
      });

      return { neededByYear, externalGaps };
    },
  };
}

async function ensureDatasetFiles(
  input: EnsureDatasetFilesInput,
): Promise<ExternalGap[]> {
  const missingYears = input.neededYears.filter(
    (year) => input.readDataset(input.dataset, year) === undefined,
  );

  if (missingYears.length > 0 && input.canDownload) {
    input.reporter?.log(`${input.logMessage}: ${missingYears.join(', ')}`);

    const outcome = await input.downloader.download(missingYears);

    if (!outcome.ok) {
      const failedYears = outcome.failures.map((failure) => failure.year);
      const gap: ExternalGap = {
        file: input.dataset,
        type: 'download_falhou',
        reference: failedYears.join(','),
        message:
          `Falha ao baixar ${input.dataset}-{ano}.csv: ${describeFailures(outcome.failures)}. ` +
          `Faltam os anos ${failedYears.join(', ')}. ` +
          `Retome com: ${input.resumeCommand} após restabelecer o acesso à fonte.`,
      };

      throw StrictModeError.fromGap(gap);
    }
  }

  return input.neededYears
    .filter((year) => input.readDataset(input.dataset, year) === undefined)
    .map((year) => input.missingFileGap(year));
}

function describeFailures(
  failures: readonly { year: number; reason: string }[],
): string {
  return failures
    .map((failure) => `${failure.year} (${failure.reason})`)
    .join('; ');
}

function missingProposicoesFileGap(year: number): ExternalGap {
  return {
    file: `proposicoes-${year}.csv`,
    type: 'fonte_ausente',
    reference: `proposicoes-${year}`,
    message: `proposicoes-${year}.csv ausente em disco; proposições do ano ${year} não foram ingeridas.`,
  };
}

function missingTemaFileGap(year: number): ExternalGap {
  return {
    file: `${TEMAS_DATASET}-${year}.csv`,
    type: 'fonte_ausente',
    reference: `${TEMAS_DATASET}-${year}`,
    message: `${TEMAS_DATASET}-${year}.csv ausente em disco; temas do ano ${year} não foram ingeridos.`,
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
