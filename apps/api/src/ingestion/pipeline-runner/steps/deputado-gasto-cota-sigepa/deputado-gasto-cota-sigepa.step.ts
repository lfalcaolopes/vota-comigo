import { StrictModeError } from '../../errors/strict-mode-error';
import { stepLabel } from '../../reporting/step-logging';
import {
  createApiWindowReporting,
  type ApiWindowReporting,
} from '../../shared/api-window-reporting';
import { mapWithConcurrency } from '../../shared/bounded-concurrency';
import type {
  ExternalGap,
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';

import { isEmExercicioNoAno } from './exercicio-no-ano';
import { aggregateGastosSigepa } from './gasto-sigepa';
import { deriveLegislaturasNoAno } from './legislaturas-do-ano';
import type {
  DeputadoDespesasClient,
  DeputadoDespesasFetchEvent,
  DeputadoDespesasFetchResult,
  DeputadoGastoCotaSigepaRepository,
  DeputadoSemReposicao,
  DespesaCota,
  GastoCotaSigepaRow,
} from './deputado-gasto-cota-sigepa.repository.types';
import type { LegislaturaPeriodo } from './legislaturas-do-ano';

const STEP_NAME = 'deputado_gasto_cota_sigepa';
const API_CONCURRENCY = 3;
const DEFAULT_CHUNK_SIZE = 50;

export type DeputadoGastoCotaSigepaStepDeps = {
  repository: DeputadoGastoCotaSigepaRepository;
  despesasClient: DeputadoDespesasClient;
  chunkSize?: number;
};

export function createDeputadoGastoCotaSigepaStep(
  deps: DeputadoGastoCotaSigepaStepDeps,
): IngestionStep {
  return {
    name: STEP_NAME,
    scope: 'annual',
    source: 'api',
    manual: true,
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      if (context.dryRun) {
        return emptyResult();
      }

      const year = context.year!;
      const reporting = createApiWindowReporting(
        context,
        stepLabel(STEP_NAME, year),
      );

      const semReposicao =
        await deps.repository.loadDeputadosSemReposicao(year);
      const legislaturas = await deps.repository.loadLegislaturas();

      // Elegível é quem exerceu mandato no ano, não quem aparece no dump: um
      // deputado cuja única despesa foi passagem aérea não está no arquivo.
      const pendentes = semReposicao.filter((deputado) =>
        isEmExercicioNoAno(deputado.intervalos, year),
      );
      const batch =
        context.limit === undefined
          ? pendentes
          : pendentes.slice(0, context.limit);

      const total = batch.length;
      const chunkSize = deps.chunkSize ?? DEFAULT_CHUNK_SIZE;
      const progress = { processed: 0, failures: 0 };
      const tally = { read: 0, inserted: 0, updated: 0, ignored: 0 };
      const rejected: Rejection[] = [];
      const externalGaps: ExternalGap[] = [];

      // Um lote por transação: uma interrupção — Ctrl-C, balde de tokens
      // vazio, aborto estrito — preserva os deputados-ano já fechados.
      for (const chunk of chunksOf(batch, chunkSize)) {
        const fetched = await fetchChunk({
          deps,
          context,
          reporting,
          chunk,
          legislaturas,
          year,
          total,
          progress,
          externalGaps,
        });

        const rows: GastoCotaSigepaRow[] = [];

        for (const { deputado, despesas } of fetched) {
          const aggregated = aggregateGastosSigepa({
            despesas,
            year,
            externalIdDeputado: deputado.externalIdDeputado,
            sourceFile: context.sourceFile,
          });

          tally.read += aggregated.read;
          tally.ignored += aggregated.ignored;

          // Descrição divergente da categoria 998 aborta o ano: seria uma
          // categoria nova entrando na reposição sem ninguém decidir (ADR 022).
          if (aggregated.fatal !== null) {
            throw new StrictModeError(aggregated.fatal);
          }

          if (context.strict && aggregated.rejected.length > 0) {
            throw new StrictModeError(aggregated.rejected[0]);
          }

          rejected.push(...aggregated.rejected);
          rows.push({
            deputadoId: deputado.deputadoId,
            year,
            gastosJson: aggregated.gastosJson,
          });
        }

        reportDebugWrite(context, rows.length);

        const { inserted, updated } = await deps.repository.upsert(rows);
        tally.inserted += inserted;
        tally.updated += updated;
      }

      reporting.pendingSummary(
        pendentes.length,
        progress.processed - progress.failures,
      );

      return {
        read: tally.read,
        inserted: tally.inserted,
        updated: tally.updated,
        ignored: tally.ignored,
        rejected,
        externalGaps,
      };
    },
  };
}

function chunksOf<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }

  return chunks;
}

type FetchedDeputado = {
  deputado: DeputadoSemReposicao;
  despesas: readonly DespesaCota[];
};

type FetchChunkInput = {
  deps: DeputadoGastoCotaSigepaStepDeps;
  context: IngestionStepContext;
  reporting: ApiWindowReporting;
  chunk: readonly DeputadoSemReposicao[];
  legislaturas: readonly LegislaturaPeriodo[];
  year: number;
  total: number;
  progress: { processed: number; failures: number };
  externalGaps: ExternalGap[];
};

async function fetchChunk(input: FetchChunkInput): Promise<FetchedDeputado[]> {
  const { context, reporting, progress } = input;

  const fetched = await mapWithConcurrency(
    input.chunk,
    API_CONCURRENCY,
    async (deputado) => {
      const startedAt = performance.now();
      const result = await input.deps.despesasClient.fetch(
        {
          externalIdDeputado: deputado.externalIdDeputado,
          year: input.year,
          externalIdLegislaturaList: deriveLegislaturasNoAno(
            deputado.intervalos,
            input.year,
            input.legislaturas,
          ),
        },
        { onEvent: debugEventHandler(context) },
      );

      progress.processed += 1;
      if (!result.ok) {
        progress.failures += 1;
      }

      reportDebugItem(context, deputado, result, performance.now() - startedAt);
      reporting.progress(progress.processed, input.total);
      reporting.status(progress.processed, input.total, progress.failures);

      return { deputado, result };
    },
  );

  const despesasByDeputado: FetchedDeputado[] = [];

  for (const { deputado, result } of fetched) {
    if (!result.ok) {
      const gap = toExternalGap(
        context.sourceFile,
        deputado,
        input.year,
        result.reason,
      );

      if (context.strict) {
        throw StrictModeError.fromGap(gap);
      }

      input.externalGaps.push(gap);
      continue;
    }

    despesasByDeputado.push({ deputado, despesas: result.despesas });
  }

  return despesasByDeputado;
}

function debugEventHandler(
  context: IngestionStepContext,
): ((event: DeputadoDespesasFetchEvent) => void) | undefined {
  const reporter = context.reporter;

  if (!context.debug || reporter?.debug === undefined) {
    return undefined;
  }

  return (event) =>
    reporter.debug?.(
      `[debug] deputado ${event.externalIdDeputado} em ${event.year} (legislatura ${event.externalIdLegislatura}): ${event.reason}, retry ${event.attempt}/${event.maxAttempts} em ${event.delayMs}ms`,
    );
}

function reportDebugItem(
  context: IngestionStepContext,
  deputado: DeputadoSemReposicao,
  result: DeputadoDespesasFetchResult,
  durationMs: number,
): void {
  const reporter = context.reporter;

  if (!context.debug || reporter?.debug === undefined) {
    return;
  }

  const ms = Math.round(durationMs);
  const outcome = result.ok
    ? `ok, ${result.despesas.length} despesas`
    : `falhou (${result.reason})`;

  reporter.debug(
    `[debug] deputado ${deputado.externalIdDeputado}: ${outcome}, ${ms}ms`,
  );
}

function reportDebugWrite(
  context: IngestionStepContext,
  rowCount: number,
): void {
  const reporter = context.reporter;

  if (!context.debug || reporter?.debug === undefined) {
    return;
  }

  reporter.debug(`[debug] gravando ${rowCount} deputados-ano no banco`);
}

function toExternalGap(
  file: string,
  deputado: DeputadoSemReposicao,
  year: number,
  reason: string,
): ExternalGap {
  return {
    file,
    type: 'fonte_externa_indisponivel',
    reference: String(deputado.externalIdDeputado),
    message:
      `Despesas indisponíveis para o deputado ${deputado.externalIdDeputado} ` +
      `em ${year}: ${reason}.`,
  };
}

function emptyResult(): StepRunResult {
  return {
    read: 0,
    inserted: 0,
    updated: 0,
    ignored: 0,
    rejected: [],
    externalGaps: [],
  };
}
