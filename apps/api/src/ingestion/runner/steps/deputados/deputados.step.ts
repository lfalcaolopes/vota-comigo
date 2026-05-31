import type {
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepRunResult,
} from '../../ingestion-runner.types';
import type { CsvRecord } from '../../csv-reader';
import type {
  DeputadoRepository,
  DeputadoRow,
  LegislaturaLookup,
} from './deputados.repository.types';
import { extractExternalIdFromUri } from '../../shared/camara-uri';
import { StrictModeError } from '../../strict-mode-error';

const MIN_LEGISLATURA_FINAL = 51;

/** Deputado válido e dentro do escopo, antes da resolução das foreign keys. */
type ParsedDeputado = {
  externalIdDeputado: number;
  uri: string | null;
  nome: string | null;
  nomeCivil: string | null;
  siglaSexo: string | null;
  dataNascimento: string | null;
  dataFalecimento: string | null;
  ufNascimento: string | null;
  municipioNascimento: string | null;
  urlRedeSocial: string | null;
  urlWebsite: string | null;
  idLegislaturaInicial: number | null;
  idLegislaturaFinal: number;
  lineNumber: number;
};

type ParseResult =
  | { outcome: 'parsed'; parsed: ParsedDeputado }
  | { outcome: 'ignored' }
  | { outcome: 'rejected'; rejection: Rejection };

export function createDeputadosStep(
  repository: DeputadoRepository,
  legislaturaLookup: LegislaturaLookup,
): IngestionStep {
  return {
    name: 'deputados',
    scope: 'single',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const parsedRows: ParsedDeputado[] = [];
      const rejected: Rejection[] = [];
      let read = 0;
      let ignored = 0;

      for await (const { record, lineNumber } of context.readRecords()) {
        read += 1;
        const parsed = parseDeputado(record, lineNumber, context.sourceFile);

        if (parsed.outcome === 'ignored') {
          ignored += 1;
          continue;
        }

        if (parsed.outcome === 'rejected') {
          if (context.strict) {
            throw new StrictModeError(parsed.rejection);
          }

          rejected.push(parsed.rejection);
          continue;
        }

        parsedRows.push(parsed.parsed);
      }

      if (context.dryRun) {
        return {
          read,
          inserted: 0,
          updated: 0,
          ignored,
          rejected,
          externalGaps: [],
        };
      }

      const legislaturaIds = await legislaturaLookup.loadIdByExternalId();
      const resolved: DeputadoRow[] = [];

      for (const parsed of parsedRows) {
        const row = resolveLegislaturaForeignKeys(
          parsed,
          legislaturaIds,
          context.sourceFile,
        );

        if (!row.ok) {
          if (context.strict) {
            throw new StrictModeError(row.rejection);
          }

          rejected.push(row.rejection);
          continue;
        }

        resolved.push(row.row);
      }

      const { inserted, updated } = await repository.upsert(resolved);

      return { read, inserted, updated, ignored, rejected, externalGaps: [] };
    },
  };
}

function parseDeputado(
  record: CsvRecord,
  lineNumber: number,
  file: string,
): ParseResult {
  const idLegislaturaFinal = parseInteger(record.idLegislaturaFinal);

  if (
    idLegislaturaFinal === null ||
    idLegislaturaFinal < MIN_LEGISLATURA_FINAL
  ) {
    return { outcome: 'ignored' };
  }

  const externalIdDeputado = extractExternalIdFromUri(record.uri);

  if (externalIdDeputado === null) {
    return {
      outcome: 'rejected',
      rejection: {
        file,
        line: lineNumber,
        type: 'validacao_uri_invalida',
        fields: { uri: record.uri ?? '' },
        message: `uri de deputado sem identificador numérico: "${record.uri ?? ''}".`,
      },
    };
  }

  return {
    outcome: 'parsed',
    parsed: {
      externalIdDeputado,
      uri: emptyToNull(record.uri),
      nome: emptyToNull(record.nome),
      nomeCivil: emptyToNull(record.nomeCivil),
      siglaSexo: emptyToNull(record.siglaSexo),
      dataNascimento: emptyToNull(record.dataNascimento),
      dataFalecimento: emptyToNull(record.dataFalecimento),
      ufNascimento: emptyToNull(record.ufNascimento),
      municipioNascimento: emptyToNull(record.municipioNascimento),
      urlRedeSocial: emptyToNull(record.urlRedeSocial),
      urlWebsite: emptyToNull(record.urlWebsite),
      idLegislaturaInicial: parseInteger(record.idLegislaturaInicial),
      idLegislaturaFinal,
      lineNumber,
    },
  };
}

type ResolveResult =
  | { ok: true; row: DeputadoRow }
  | { ok: false; rejection: Rejection };

function resolveLegislaturaForeignKeys(
  parsed: ParsedDeputado,
  legislaturaIds: ReadonlyMap<number, string>,
  file: string,
): ResolveResult {
  const legislaturaFinalId = legislaturaIds.get(parsed.idLegislaturaFinal);

  if (legislaturaFinalId === undefined) {
    return missingLegislatura(parsed, parsed.idLegislaturaFinal, file);
  }

  let legislaturaInicialId: string | null = null;

  if (parsed.idLegislaturaInicial !== null) {
    const resolved = legislaturaIds.get(parsed.idLegislaturaInicial);

    if (resolved === undefined) {
      return missingLegislatura(parsed, parsed.idLegislaturaInicial, file);
    }

    legislaturaInicialId = resolved;
  }

  return {
    ok: true,
    row: {
      externalIdDeputado: parsed.externalIdDeputado,
      uri: parsed.uri,
      nome: parsed.nome,
      nomeCivil: parsed.nomeCivil,
      siglaSexo: parsed.siglaSexo,
      dataNascimento: parsed.dataNascimento,
      dataFalecimento: parsed.dataFalecimento,
      ufNascimento: parsed.ufNascimento,
      municipioNascimento: parsed.municipioNascimento,
      urlRedeSocial: parsed.urlRedeSocial,
      urlWebsite: parsed.urlWebsite,
      legislaturaInicialId,
      legislaturaFinalId,
    },
  };
}

function missingLegislatura(
  parsed: ParsedDeputado,
  externalIdLegislatura: number,
  file: string,
): ResolveResult {
  return {
    ok: false,
    rejection: {
      file,
      line: parsed.lineNumber,
      type: 'validacao_legislatura_ausente',
      fields: {
        externalIdDeputado: String(parsed.externalIdDeputado),
        idLegislatura: String(externalIdLegislatura),
      },
      message: `legislatura ${externalIdLegislatura} não encontrada para o deputado ${parsed.externalIdDeputado}.`,
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

  return Number(value.trim());
}

function emptyToNull(value: string | undefined): string | null {
  if (value === undefined || value === '') {
    return null;
  }

  return value;
}
