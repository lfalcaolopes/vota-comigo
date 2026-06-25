import type {
  ExternalGap,
  IngestionReporter,
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';
import { mapWithConcurrency } from '../../shared/bounded-concurrency';
import { extractExternalIdFromUri } from '../../shared/camara-uri';
import { normalizeSiglaPartido } from '../../shared/sigla-partido';
import { StrictModeError } from '../../errors/strict-mode-error';
import type { LegislaturaLookup } from '../deputados/deputados.repository.types';
import type {
  PartidoRepository,
  PartidoRow,
} from '../partidos/partidos.repository.types';
import type {
  DeputadoHistoricoClient,
  DeputadoHistoricoFetchEvent,
  DeputadoHistoricoFetchResult,
  DeputadoHistoricoRepository,
  DeputadoHistoricoRow,
  DeputadoSource,
  HistoricoEvento,
  IngestedDeputado,
  PartidoLookup,
} from './deputado-historico.repository.types';

const API_CONCURRENCY = 3;
const PROGRESS_INTERVAL = 50;
const DEFAULT_CHUNK_SIZE = 50;

export type DeputadoHistoricoStepDeps = {
  deputadoSource: DeputadoSource;
  historicoClient: DeputadoHistoricoClient;
  legislaturaLookup: LegislaturaLookup;
  partidoLookup: PartidoLookup;
  partidoRepository: PartidoRepository;
  historicoRepository: DeputadoHistoricoRepository;
  chunkSize?: number;
};

export function createDeputadoHistoricoStep(
  deps: DeputadoHistoricoStepDeps,
): IngestionStep {
  return {
    name: 'deputado_historico',
    scope: 'single',
    source: 'api',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      if (context.dryRun) {
        return emptyResult();
      }

      const loaded = await deps.deputadoSource.loadIngested();
      const batch =
        context.limit === undefined ? loaded : loaded.slice(0, context.limit);

      const total = batch.length;
      const chunkSize = deps.chunkSize ?? DEFAULT_CHUNK_SIZE;
      const legislaturaIds = await deps.legislaturaLookup.loadIdByExternalId();

      const progress = { processed: 0, failures: 0 };
      const tally = { read: 0, inserted: 0, updated: 0 };
      const rejected: Rejection[] = [];
      const externalGaps: ExternalGap[] = [];

      // Persist one chunk per transaction so an interruption (Ctrl-C, throttle,
      // strict abort) preserves the deputados already written in earlier chunks.
      for (const chunk of chunksOf(batch, chunkSize)) {
        const events = await fetchChunk(
          deps,
          context,
          chunk,
          total,
          progress,
          externalGaps,
        );

        const partidoIds = await resolvePartidoIds(
          deps,
          events.map(({ evento }) => evento),
        );

        tally.read += events.length;

        const rows: DeputadoHistoricoRow[] = [];

        for (const { deputado, evento } of events) {
          const resolved = resolveEvent(
            deputado,
            evento,
            legislaturaIds,
            partidoIds,
            context.sourceFile,
          );

          if (!resolved.ok) {
            if (context.strict) {
              throw new StrictModeError(resolved.rejection);
            }

            rejected.push(resolved.rejection);
            continue;
          }

          rows.push(resolved.row);
        }

        reportDebugWrite(context, rows.length);

        const { inserted, updated } =
          await deps.historicoRepository.upsert(rows);
        tally.inserted += inserted;
        tally.updated += updated;
      }

      reportPendingSummary(
        context,
        loaded.length,
        progress.processed - progress.failures,
      );

      return {
        read: tally.read,
        inserted: tally.inserted,
        updated: tally.updated,
        ignored: 0,
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

type FetchedEvent = {
  deputado: IngestedDeputado;
  evento: HistoricoEvento;
};

async function fetchChunk(
  deps: DeputadoHistoricoStepDeps,
  context: IngestionStepContext,
  chunk: readonly IngestedDeputado[],
  total: number,
  progress: { processed: number; failures: number },
  externalGaps: ExternalGap[],
): Promise<FetchedEvent[]> {
  const fetched = await mapWithConcurrency(
    chunk,
    API_CONCURRENCY,
    async (deputado) => {
      const startedAt = performance.now();
      const result = await deps.historicoClient.fetch(
        deputado.externalIdDeputado,
        { onEvent: debugEventHandler(context) },
      );

      progress.processed += 1;
      if (!result.ok) {
        progress.failures += 1;
      }

      reportDebugItem(context, deputado, result, performance.now() - startedAt);
      reportProgress(context.reporter, progress.processed, total);
      reportStatus(context, progress.processed, total, progress.failures);

      return { deputado, result };
    },
  );

  const events: FetchedEvent[] = [];

  for (const { deputado, result } of fetched) {
    if (!result.ok) {
      const gap = toExternalGap(context.sourceFile, deputado, result.reason);

      if (context.strict) {
        throw StrictModeError.fromGap(gap);
      }

      externalGaps.push(gap);
      continue;
    }

    for (const evento of result.eventos) {
      events.push({ deputado, evento });
    }
  }

  return events;
}

function reportPendingSummary(
  context: IngestionStepContext,
  totalPending: number,
  processed: number,
): void {
  const reporter = context.reporter;

  if (reporter === undefined) {
    return;
  }

  const remaining = Math.max(totalPending - processed, 0);
  const tail =
    remaining > 0 ? ' — rode de novo para continuar' : ' — nada pendente';

  reporter.log(
    `[deputado_historico] ${processed} processados nesta janela, ${remaining} ainda pendentes${tail}`,
  );
}

function reportProgress(
  reporter: IngestionReporter | undefined,
  processed: number,
  total: number,
): void {
  if (reporter === undefined) {
    return;
  }

  if (processed !== total && processed % PROGRESS_INTERVAL !== 0) {
    return;
  }

  const pct = total === 0 ? 100 : Math.round((processed / total) * 100);

  reporter.log(
    `[deputado_historico] ${processed}/${total} deputados (${pct}%)`,
  );
}

function debugEventHandler(
  context: IngestionStepContext,
): ((event: DeputadoHistoricoFetchEvent) => void) | undefined {
  const reporter = context.reporter;

  if (!context.debug || reporter?.debug === undefined) {
    return undefined;
  }

  return (event) =>
    reporter.debug?.(
      `[debug] deputado ${event.externalIdDeputado}: ${event.reason}, retry ${event.attempt}/${event.maxAttempts} em ${event.delayMs}ms`,
    );
}

function reportDebugItem(
  context: IngestionStepContext,
  deputado: IngestedDeputado,
  result: DeputadoHistoricoFetchResult,
  durationMs: number,
): void {
  const reporter = context.reporter;

  if (!context.debug || reporter?.debug === undefined) {
    return;
  }

  const ms = Math.round(durationMs);
  const outcome = result.ok
    ? `ok, ${result.eventos.length} eventos`
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

  reporter.debug(`[debug] gravando ${rowCount} eventos no banco em lotes`);
}

function reportStatus(
  context: IngestionStepContext,
  processed: number,
  total: number,
  failures: number,
): void {
  const reporter = context.reporter;

  if (!context.debug || reporter?.status === undefined) {
    return;
  }

  const pct = total === 0 ? 100 : Math.round((processed / total) * 100);

  reporter.status(
    `deputado_historico ${processed}/${total} (${pct}%) ok:${processed - failures} falhas:${failures}`,
  );
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

function toExternalGap(
  file: string,
  deputado: IngestedDeputado,
  reason: string,
): ExternalGap {
  return {
    file,
    type: 'fonte_externa_indisponivel',
    reference: String(deputado.externalIdDeputado),
    message: `Histórico indisponível para o deputado ${deputado.externalIdDeputado}: ${reason}.`,
  };
}

async function resolvePartidoIds(
  deps: DeputadoHistoricoStepDeps,
  eventos: readonly HistoricoEvento[],
): Promise<ReadonlyMap<number, string>> {
  const known = await deps.partidoLookup.loadIdByExternalId();
  const missing = new Map<number, PartidoRow>();

  for (const evento of eventos) {
    const externalIdPartido = extractExternalIdFromUri(
      evento.uriPartido ?? undefined,
    );

    if (externalIdPartido === null || known.has(externalIdPartido)) {
      continue;
    }

    missing.set(externalIdPartido, {
      externalIdPartido,
      sigla: normalizeSiglaPartido(evento.siglaPartido),
      uri: evento.uriPartido,
    });
  }

  if (missing.size === 0) {
    return known;
  }

  await deps.partidoRepository.upsert([...missing.values()]);

  return deps.partidoLookup.loadIdByExternalId();
}

type ResolveResult =
  | { ok: true; row: DeputadoHistoricoRow }
  | { ok: false; rejection: Rejection };

function resolveEvent(
  deputado: IngestedDeputado,
  evento: HistoricoEvento,
  legislaturaIds: ReadonlyMap<number, string>,
  partidoIds: ReadonlyMap<number, string>,
  file: string,
): ResolveResult {
  const legislaturaId =
    evento.idLegislatura === null
      ? undefined
      : legislaturaIds.get(evento.idLegislatura);

  if (legislaturaId === undefined) {
    return {
      ok: false,
      rejection: rejection(file, deputado, evento, {
        type: 'validacao_legislatura_ausente',
        idLegislatura: String(evento.idLegislatura ?? ''),
        message: `legislatura ${evento.idLegislatura ?? ''} não encontrada para o deputado ${deputado.externalIdDeputado}.`,
      }),
    };
  }

  const partido = resolvePartidoId(evento.uriPartido, partidoIds);

  if (!partido.ok) {
    return {
      ok: false,
      rejection: rejection(file, deputado, evento, {
        type: 'validacao_uri_partido_invalida',
        uriPartido: evento.uriPartido ?? '',
        message: `uriPartido sem identificador numérico: "${evento.uriPartido ?? ''}".`,
      }),
    };
  }

  return {
    ok: true,
    row: {
      deputadoId: deputado.id,
      legislaturaId,
      partidoId: partido.partidoId,
      dataHora: evento.dataHora,
      situacao: evento.situacao,
      condicaoEleitoral: evento.condicaoEleitoral,
      descricaoStatus: evento.descricaoStatus,
      nome: evento.nome,
      nomeEleitoral: evento.nomeEleitoral,
      siglaUf: evento.siglaUf,
      email: evento.email,
      urlFoto: evento.urlFoto,
    },
  };
}

type PartidoResolution = { ok: true; partidoId: string | null } | { ok: false };

function resolvePartidoId(
  uriPartido: string | null,
  partidoIds: ReadonlyMap<number, string>,
): PartidoResolution {
  if (uriPartido === null || uriPartido.trim() === '') {
    return { ok: true, partidoId: null };
  }

  const externalIdPartido = extractExternalIdFromUri(uriPartido);

  if (externalIdPartido === null) {
    return { ok: false };
  }

  return { ok: true, partidoId: partidoIds.get(externalIdPartido) ?? null };
}

function rejection(
  file: string,
  deputado: IngestedDeputado,
  evento: HistoricoEvento,
  details: { type: string; message: string } & Record<string, string>,
): Rejection {
  const { type, message, ...extra } = details;

  return {
    file,
    line: 0,
    type,
    fields: {
      externalIdDeputado: String(deputado.externalIdDeputado),
      dataHora: evento.dataHora,
      descricaoStatus: evento.descricaoStatus,
      ...extra,
    },
    message,
  };
}
