import type {
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';
import type {
  LegislaturaRepository,
  LegislaturaRow,
} from './legislaturas.repository.types';
import { StrictModeError } from '../../errors/strict-mode-error';

type ParseResult =
  | { ok: true; row: LegislaturaRow }
  | { ok: false; rejection: Rejection };

export function createLegislaturasStep(
  repository: LegislaturaRepository,
): IngestionStep {
  return {
    name: 'legislaturas',
    scope: 'single',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const validRows: LegislaturaRow[] = [];
      const rejected: Rejection[] = [];
      let read = 0;

      for await (const { record, lineNumber } of context.readRecords()) {
        read += 1;
        const parsed = parseLegislatura(record, lineNumber, context.sourceFile);

        if (!parsed.ok) {
          if (context.strict) {
            throw new StrictModeError(parsed.rejection);
          }

          rejected.push(parsed.rejection);
          continue;
        }

        validRows.push(parsed.row);
      }

      const { inserted, updated } = context.dryRun
        ? { inserted: 0, updated: 0 }
        : await repository.upsert(validRows);

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

function parseLegislatura(
  record: Record<string, string>,
  lineNumber: number,
  file: string,
): ParseResult {
  const externalIdLegislatura = parseInteger(record.idLegislatura);

  if (externalIdLegislatura === null) {
    return {
      ok: false,
      rejection: {
        file,
        line: lineNumber,
        type: 'validacao_id_invalido',
        fields: { idLegislatura: record.idLegislatura ?? '' },
        message: `idLegislatura inválido: "${record.idLegislatura ?? ''}".`,
      },
    };
  }

  return {
    ok: true,
    row: {
      externalIdLegislatura,
      uri: emptyToNull(record.uri),
      dataInicio: emptyToNull(record.dataInicio),
      dataFim: emptyToNull(record.dataFim),
      anoEleicao: parseInteger(record.anoEleicao),
    },
  };
}

function parseInteger(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }

  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  return Number(value);
}

function emptyToNull(value: string | undefined): string | null {
  if (value === undefined || value === '') {
    return null;
  }

  return value;
}
