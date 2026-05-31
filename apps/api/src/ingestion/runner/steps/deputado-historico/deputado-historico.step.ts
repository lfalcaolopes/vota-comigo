import type {
  ExternalGap,
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepRunResult,
} from '../../ingestion-runner.types';
import { mapWithConcurrency } from '../../shared/bounded-concurrency';
import { extractExternalIdFromUri } from '../../shared/camara-uri';
import { StrictModeError } from '../../strict-mode-error';
import type { LegislaturaLookup } from '../deputados/deputados.repository.types';
import type {
  PartidoRepository,
  PartidoRow,
} from '../partidos/partidos.repository.types';
import type {
  DeputadoHistoricoClient,
  DeputadoHistoricoRepository,
  DeputadoHistoricoRow,
  DeputadoSource,
  HistoricoEvento,
  IngestedDeputado,
  PartidoLookup,
} from './deputado-historico.repository.types';

const API_CONCURRENCY = 3;

export type DeputadoHistoricoStepDeps = {
  deputadoSource: DeputadoSource;
  historicoClient: DeputadoHistoricoClient;
  legislaturaLookup: LegislaturaLookup;
  partidoLookup: PartidoLookup;
  partidoRepository: PartidoRepository;
  historicoRepository: DeputadoHistoricoRepository;
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

      const deputados = await deps.deputadoSource.loadIngested();

      const fetched = await mapWithConcurrency(
        deputados,
        API_CONCURRENCY,
        async (deputado) => ({
          deputado,
          result: await deps.historicoClient.fetch(deputado.externalIdDeputado),
        }),
      );

      const events: Array<{
        deputado: IngestedDeputado;
        evento: HistoricoEvento;
      }> = [];
      const externalGaps: ExternalGap[] = [];

      for (const { deputado, result } of fetched) {
        if (!result.ok) {
          const gap = toExternalGap(
            context.sourceFile,
            deputado,
            result.reason,
          );

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

      const legislaturaIds = await deps.legislaturaLookup.loadIdByExternalId();
      const partidoIds = await resolvePartidoIds(
        deps,
        events.map(({ evento }) => evento),
      );

      const rows: DeputadoHistoricoRow[] = [];
      const rejected: Rejection[] = [];

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

      const { inserted, updated } = await deps.historicoRepository.upsert(rows);

      return {
        read: events.length,
        inserted,
        updated,
        ignored: 0,
        rejected,
        externalGaps,
      };
    },
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
      sigla: evento.siglaPartido,
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
