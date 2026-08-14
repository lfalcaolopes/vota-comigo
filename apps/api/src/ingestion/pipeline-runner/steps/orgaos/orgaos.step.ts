import { extractExternalIdFromUri } from '../../shared/camara-uri';
import { StrictModeError } from '../../errors/strict-mode-error';
import type {
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';
import type { OrgaoRepository, OrgaoRow } from './orgaos.repository.types';

function orNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? null : trimmed;
}

function codTipoOrgaoOrNull(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === '' || !/^\d+$/.test(trimmed)) {
    return null;
  }
  return Number(trimmed);
}

export function createOrgaosStep(repository: OrgaoRepository): IngestionStep {
  return {
    name: 'orgaos',
    scope: 'single',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const orgaos = new Map<number, OrgaoRow>();
      const rejected: Rejection[] = [];
      const invalidUris = new Set<string>();

      for await (const { record, lineNumber } of context.readRecords()) {
        const uri = record.uri ?? '';
        const externalIdOrgao = extractExternalIdFromUri(uri);

        if (externalIdOrgao === null) {
          const rejection: Rejection = {
            file: context.sourceFile,
            line: lineNumber,
            type: 'validacao_uri_orgao_invalida',
            fields: { uri },
            message: `uri sem identificador numérico: "${uri}".`,
          };

          if (context.strict) {
            throw new StrictModeError(rejection);
          }

          if (!invalidUris.has(uri)) {
            invalidUris.add(uri);
            rejected.push(rejection);
          }

          continue;
        }

        orgaos.set(externalIdOrgao, {
          externalIdOrgao,
          uri,
          sigla: orNull(record.sigla),
          apelido: orNull(record.apelido),
          nome: orNull(record.nome),
          nomePublicacao: orNull(record.nomePublicacao),
          externalCodTipoOrgao: codTipoOrgaoOrNull(record.codTipoOrgao),
          tipoOrgao: orNull(record.tipoOrgao),
          casa: orNull(record.casa),
        });
      }

      const read = orgaos.size;

      const { inserted, updated } = context.dryRun
        ? { inserted: 0, updated: 0 }
        : await repository.upsert([...orgaos.values()]);

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
