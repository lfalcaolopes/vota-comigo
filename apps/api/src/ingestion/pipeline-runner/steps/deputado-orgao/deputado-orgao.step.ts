import { deriveLegislaturasFromYears } from '@/ingestion/camara-csv-downloader/plan/legislatura-range';

import { extractExternalIdFromUri } from '../../shared/camara-uri';
import { StrictModeError } from '../../errors/strict-mode-error';
import type {
  ExternalGap,
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';
import type {
  DeputadoOrgaoRepository,
  DeputadoOrgaoRow,
} from './deputado-orgao.repository.types';

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return false;
  }
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value.slice(0, 10)
  );
}

function toIsoDate(value: string): string {
  return value.slice(0, 10);
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

function fileNameFor(legislatura: number): string {
  return `orgaosDeputados-L${legislatura}.csv`;
}

function missingFileGap(legislatura: number): ExternalGap {
  const file = fileNameFor(legislatura);
  return {
    file,
    type: 'fonte_ausente',
    reference: String(legislatura),
    message: `${file} ausente em disco; vínculos com órgãos da legislatura ${legislatura} não foram ingeridos.`,
  };
}

function emptyFileGap(legislatura: number): ExternalGap {
  const file = fileNameFor(legislatura);
  return {
    file,
    type: 'fonte_vazia',
    reference: String(legislatura),
    message: `Nenhum vínculo utilizável em ${file}; os vínculos já carregados da legislatura ${legislatura} foram preservados.`,
  };
}

export function createDeputadoOrgaoStep(
  repository: DeputadoOrgaoRepository,
): IngestionStep {
  return {
    name: 'deputado_orgao',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const orgaoIds = await repository.loadOrgaoIdByExternalId();

      // Sem órgãos carregados, nada é resolvível: gravar apagaria vínculos
      // bons por conta de um passo `orgaos` ainda não executado.
      if (orgaoIds.size === 0) {
        context.reporter?.log(
          '[deputado_orgao] tabela orgao vazia, vínculos não calculados',
        );
        return emptyResult();
      }

      const deputadoIds = await repository.loadDeputadoIdByExternalId();
      const legislaturaIds = await repository.loadLegislaturaIdByExternalId();
      const legislaturas = deriveLegislaturasFromYears(context.years ?? []);

      let read = 0;
      let inserted = 0;
      let ignored = 0;
      const rejected: Rejection[] = [];
      const externalGaps: ExternalGap[] = [];
      const unknownOrgaoIds = new Set<number>();

      for (const legislaturaExternalId of legislaturas) {
        const legislaturaId = legislaturaIds.get(legislaturaExternalId);

        if (legislaturaId === undefined) {
          continue;
        }

        const source = context.readLegislaturaDataset?.(
          'orgaosDeputados',
          legislaturaExternalId,
        );

        if (source === undefined) {
          const gap = missingFileGap(legislaturaExternalId);

          if (context.strict) {
            throw StrictModeError.fromGap(gap);
          }

          externalGaps.push(gap);
          continue;
        }

        const file = fileNameFor(legislaturaExternalId);
        const rows: DeputadoOrgaoRow[] = [];

        for await (const { record, lineNumber } of source()) {
          read += 1;

          const externalIdOrgao = extractExternalIdFromUri(record.uriOrgao);
          const externalIdDeputado = extractExternalIdFromUri(
            record.uriDeputado,
          );

          if (externalIdOrgao === null || externalIdDeputado === null) {
            const rejection: Rejection = {
              file,
              line: lineNumber,
              type: 'validacao_uri_invalida',
              fields: {
                uriOrgao: record.uriOrgao ?? '',
                uriDeputado: record.uriDeputado ?? '',
              },
              message: `uriOrgao ou uriDeputado sem identificador numérico na linha ${lineNumber}.`,
            };

            if (context.strict) {
              throw new StrictModeError(rejection);
            }

            rejected.push(rejection);
            continue;
          }

          const deputadoId = deputadoIds.get(externalIdDeputado);

          if (deputadoId === undefined) {
            ignored += 1;
            continue;
          }

          const orgaoId = orgaoIds.get(externalIdOrgao);

          if (orgaoId === undefined) {
            if (!unknownOrgaoIds.has(externalIdOrgao)) {
              unknownOrgaoIds.add(externalIdOrgao);
              const gap: ExternalGap = {
                file,
                type: 'orgao_desconhecido',
                reference: String(externalIdOrgao),
                message: `Órgão ${externalIdOrgao} referenciado em ${file} não está carregado em orgao.`,
              };

              if (context.strict) {
                throw StrictModeError.fromGap(gap);
              }

              externalGaps.push(gap);
            }

            continue;
          }

          const dataInicio = record.dataInicio ?? '';

          if (!isValidDate(dataInicio)) {
            const rejection: Rejection = {
              file,
              line: lineNumber,
              type: 'validacao_data_inicio_invalida',
              fields: { dataInicio },
              message: `dataInicio ausente ou malformada na linha ${lineNumber}: "${dataInicio}".`,
            };

            if (context.strict) {
              throw new StrictModeError(rejection);
            }

            rejected.push(rejection);
            continue;
          }

          const dataFim = record.dataFim?.trim();

          rows.push({
            deputadoId,
            orgaoId,
            legislaturaId,
            cargo: record.cargo?.trim() || null,
            dataInicio: toIsoDate(dataInicio),
            dataFim:
              dataFim === undefined || dataFim === ''
                ? null
                : toIsoDate(dataFim),
          });
        }

        if (rows.length === 0) {
          externalGaps.push(emptyFileGap(legislaturaExternalId));
          continue;
        }

        if (!context.dryRun) {
          const replaced = await repository.replaceLegislatura(
            legislaturaId,
            rows,
          );
          inserted += replaced.inserted;
        }
      }

      return { read, inserted, updated: 0, ignored, rejected, externalGaps };
    },
  };
}
