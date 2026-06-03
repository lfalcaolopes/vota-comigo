import type {
  ExternalGap,
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../ingestion-runner.types';
import { StrictModeError } from '../../strict-mode-error';
import { normalizeProposicaoTemaRecord } from '../../shared/proposicoes-temas.normalizer';
import { collectNeededProposicoes } from '../proposicoes/needed-proposicoes';
import type { DatasetDownloader } from '../../shared/dataset-downloader';
import type { ProposicaoLookup } from '../votacao-proposicao/votacao-proposicao.repository.types';
import type {
  ProposicaoTemaRow,
  TemaLookup,
  TemaRepository,
  TemaRow,
} from './tema.repository.types';

const TEMA_DATASET = 'proposicoesTemas';

export type TemaStepDeps = {
  repository: TemaRepository;
  downloader: DatasetDownloader;
  proposicaoLookup: ProposicaoLookup;
  temaLookup: TemaLookup;
};

type PendingVinculo = {
  externalIdProposicao: number;
  externalCodTema: number;
  proposicaoId: string;
};

export function createTemaStep(deps: TemaStepDeps): IngestionStep {
  return {
    name: 'tema',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const readDataset = context.readDataset;

      if (readDataset === undefined) {
        throw new Error(
          'Passo tema requer readDataset no contexto de execução.',
        );
      }

      const { neededByYear } = await collectNeededProposicoes({
        years: context.years ?? [],
        limit: context.limit,
        readDataset,
      });

      const neededYears = [...neededByYear.keys()];
      context.reporter?.log(
        `[tema] temas necessários para proposições de ${neededYears.length} ano(s)`,
      );

      await ensureTemaFiles(context, neededYears, deps.downloader);

      const proposicaoIds = await deps.proposicaoLookup.loadIdByExternalId();

      const temaByCod = new Map<number, TemaRow>();
      const vinculoKeys = new Set<string>();
      const pendingVinculos: PendingVinculo[] = [];
      const externalGaps: ExternalGap[] = [];
      let read = 0;
      let ignored = 0;

      for (const year of neededYears) {
        const yearSource = readDataset(TEMA_DATASET, year);

        if (yearSource === undefined) {
          externalGaps.push(missingFileGap(year));
          continue;
        }

        context.reporter?.log(`[tema] lendo ${TEMA_DATASET}-${year}.csv`);

        for await (const { record } of yearSource()) {
          const { externalIdProposicao, codTema, tema } =
            normalizeProposicaoTemaRecord(record);

          if (externalIdProposicao === null || codTema === null) {
            ignored += 1;
            continue;
          }

          const proposicaoId = proposicaoIds.get(externalIdProposicao);

          if (proposicaoId === undefined) {
            ignored += 1;
            continue;
          }

          if (!temaByCod.has(codTema)) {
            temaByCod.set(codTema, { externalCodTema: codTema, tema });
          }

          const key = `${externalIdProposicao}:${codTema}`;

          if (!vinculoKeys.has(key)) {
            vinculoKeys.add(key);
            pendingVinculos.push({
              externalIdProposicao,
              externalCodTema: codTema,
              proposicaoId,
            });
            read += 1;
          }
        }
      }

      if (context.dryRun) {
        return {
          read,
          inserted: 0,
          updated: 0,
          ignored,
          rejected: [],
          externalGaps,
        };
      }

      const temaResult = await deps.repository.upsertTemas([
        ...temaByCod.values(),
      ]);

      const temaIds = await deps.temaLookup.loadIdByExternalCodTema();
      const vinculoRows = resolveVinculos(pendingVinculos, temaIds);
      const vinculoResult = await deps.repository.upsertVinculos(vinculoRows);

      return {
        read,
        inserted: temaResult.inserted + vinculoResult.inserted,
        updated: temaResult.updated + vinculoResult.updated,
        ignored,
        rejected: [],
        externalGaps,
      };
    },
  };
}

function resolveVinculos(
  pending: readonly PendingVinculo[],
  temaIds: ReadonlyMap<number, string>,
): ProposicaoTemaRow[] {
  const rows: ProposicaoTemaRow[] = [];

  for (const item of pending) {
    const temaId = temaIds.get(item.externalCodTema);

    if (temaId === undefined) {
      continue;
    }

    rows.push({
      externalIdProposicao: item.externalIdProposicao,
      externalCodTema: item.externalCodTema,
      proposicaoId: item.proposicaoId,
      temaId,
    });
  }

  return rows;
}

async function ensureTemaFiles(
  context: IngestionStepContext,
  neededYears: readonly number[],
  downloader: DatasetDownloader,
): Promise<void> {
  if (context.dryRun) {
    return;
  }

  const missingYears = neededYears.filter(
    (year) => context.readDataset!(TEMA_DATASET, year) === undefined,
  );

  if (missingYears.length === 0) {
    return;
  }

  context.reporter?.log(
    `[tema] baixando ${TEMA_DATASET}-{ano}.csv ausentes: ${missingYears.join(', ')}`,
  );

  const outcome = await downloader.download(missingYears);

  if (!outcome.ok) {
    const failedYears = outcome.failures.map((failure) => failure.year);
    const gap: ExternalGap = {
      file: TEMA_DATASET,
      type: 'download_falhou',
      reference: failedYears.join(','),
      message:
        `Falha ao baixar ${TEMA_DATASET}-{ano}.csv: ${describeFailures(outcome.failures)}. ` +
        `Faltam os anos ${failedYears.join(', ')}. ` +
        `Retome com: npm run ingest -- --only=tema após restabelecer o acesso à fonte.`,
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
    file: `${TEMA_DATASET}-${year}.csv`,
    type: 'fonte_ausente',
    reference: `${TEMA_DATASET}-${year}`,
    message: `${TEMA_DATASET}-${year}.csv ausente em disco; temas do ano ${year} não foram ingeridos.`,
  };
}
