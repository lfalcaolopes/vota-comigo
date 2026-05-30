import type {
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepRunResult,
} from '../ingestion-runner.types';
import type {
  PartidoRepository,
  PartidoRow,
} from './partidos.repository.types';
import { normalizeVotacaoVotoRecord } from '../shared/votacoes-votos.normalizer';
import { StrictModeError } from '../strict-mode-error';

export function createPartidosStep(
  repository: PartidoRepository,
): IngestionStep {
  return {
    name: 'partidos',
    scope: 'annual',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const partidos = new Map<number, PartidoRow>();
      const rejected: Rejection[] = [];
      const invalidUris = new Set<string>();

      for await (const { record, lineNumber } of context.readRecords()) {
        const { partido } = normalizeVotacaoVotoRecord(record);

        if (partido.status === 'absent') {
          continue;
        }

        if (partido.status === 'invalid') {
          const rejection: Rejection = {
            file: context.sourceFile,
            line: lineNumber,
            type: 'validacao_uri_partido_invalida',
            fields: { deputado_uriPartido: partido.uri },
            message: `uriPartido sem identificador numérico: "${partido.uri}".`,
          };

          if (context.strict) {
            throw new StrictModeError(rejection);
          }

          if (!invalidUris.has(partido.uri)) {
            invalidUris.add(partido.uri);
            rejected.push(rejection);
          }

          continue;
        }

        partidos.set(partido.externalIdPartido, {
          externalIdPartido: partido.externalIdPartido,
          sigla: partido.sigla,
          uri: partido.uri,
        });
      }

      const read = partidos.size;

      const { inserted, updated } = context.dryRun
        ? { inserted: 0, updated: 0 }
        : await repository.upsert([...partidos.values()]);

      return {
        read,
        inserted,
        updated,
        ignored: 0,
        rejected,
        externalGaps: [],
      };
    },
  };
}
