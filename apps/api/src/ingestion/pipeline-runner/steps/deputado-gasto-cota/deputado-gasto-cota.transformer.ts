import type { CsvRow } from '../../sources/csv-reader';
import type {
  ExternalGap,
  Rejection,
} from '../../types/ingestion-pipeline-runner.types';

import { deriveValorUtilizadoCentavos } from './valor-utilizado';
import type {
  CotaCategoriaRow,
  DeputadoGastoCotaRow,
} from './deputado-gasto-cota.repository.types';

export type AggregateDeputadoGastoCotaInput = {
  rows: AsyncIterable<CsvRow> | Iterable<CsvRow>;
  sourceFile: string;
  year: number;
  deputadoIds: ReadonlyMap<number, string>;
};

export type AggregateDeputadoGastoCotaResult = {
  rows: readonly DeputadoGastoCotaRow[];
  // Maior mês presente no arquivo, sobre todos os deputados: derivar por
  // deputado faria um mês sem gasto virar lacuna só para ele.
  coveredThroughMonth: number | null;
  // Preenchido quando o arquivo é internamente inconsistente: a carga inteira
  // é abortada, nunca parcialmente aplicada.
  fatal: Rejection | null;
  totalValorUtilizadoCentavos: number;
  categorias: readonly CotaCategoriaRow[];
  read: number;
  ignored: number;
  rejected: Rejection[];
  externalGaps: ExternalGap[];
};

export async function aggregateDeputadoGastoCota(
  input: AggregateDeputadoGastoCotaInput,
): Promise<AggregateDeputadoGastoCotaResult> {
  const aggregates = new Map<string, DeputadoGastoCotaRow>();
  const externalGapsByExternalId = new Map<string, ExternalGap>();
  const rejected: Rejection[] = [];
  let read = 0;
  let ignored = 0;
  let coveredThroughMonth: number | null = null;
  let totalValorUtilizadoCentavos = 0;
  const descricaoByNumSubCota = new Map<number, string>();
  const siglaUfByDeputadoId = new Map<string, string>();

  function abort(fatal: Rejection): AggregateDeputadoGastoCotaResult {
    return {
      rows: [],
      coveredThroughMonth: null,
      totalValorUtilizadoCentavos: 0,
      categorias: [],
      fatal,
      read,
      ignored,
      rejected,
      externalGaps: [...externalGapsByExternalId.values()],
    };
  }

  for await (const { lineNumber, record } of input.rows) {
    read += 1;

    // Linhas sem ideCadastro são de lideranças, fora do escopo do perfil.
    if (record.ideCadastro === '') {
      ignored += 1;
      continue;
    }

    const deputadoId = input.deputadoIds.get(Number(record.ideCadastro));

    if (deputadoId === undefined) {
      externalGapsByExternalId.set(record.ideCadastro, {
        file: input.sourceFile,
        type: 'deputado_externo_desconhecido',
        reference: record.ideCadastro,
        message:
          `Deputado externo ${record.ideCadastro} não encontrado para os ` +
          `gastos da cota de ${input.year}.`,
      });
      continue;
    }

    const year = toInteger(record.numAno);
    const month = toInteger(record.numMes);
    const externalNumSubCota = toInteger(record.numSubCota);
    const valor = deriveValorUtilizadoCentavos({
      vlrLiquido: record.vlrLiquido,
      vlrRestituicao: record.vlrRestituicao,
    });

    if (year !== input.year) {
      rejected.push(
        rejection(input, lineNumber, record, 'ano_divergente', {
          numAno: record.numAno,
        }),
      );
      continue;
    }

    if (month === null || month < 1 || month > 12) {
      rejected.push(
        rejection(input, lineNumber, record, 'mes_invalido', {
          numMes: record.numMes,
        }),
      );
      continue;
    }

    if (externalNumSubCota === null) {
      rejected.push(
        rejection(input, lineNumber, record, 'categoria_invalida', {
          numSubCota: record.numSubCota,
        }),
      );
      continue;
    }

    if (!valor.ok) {
      rejected.push(
        rejection(input, lineNumber, record, 'valor_invalido', {
          [valor.field]: valor.value,
        }),
      );
      continue;
    }

    const descricaoConhecida = descricaoByNumSubCota.get(externalNumSubCota);

    if (
      descricaoConhecida !== undefined &&
      descricaoConhecida !== record.txtDescricao
    ) {
      return abort({
        file: input.sourceFile,
        line: lineNumber,
        type: 'descricao_conflitante',
        fields: {
          ideCadastro: record.ideCadastro,
          numSubCota: record.numSubCota,
          txtDescricao: record.txtDescricao,
          descricaoAnterior: descricaoConhecida,
        },
        message:
          `Categoria ${record.numSubCota} aparece com descrições ` +
          `conflitantes em ${input.sourceFile}: "${descricaoConhecida}" e ` +
          `"${record.txtDescricao}".`,
      });
    }

    const siglaUfConhecida = siglaUfByDeputadoId.get(deputadoId);

    if (siglaUfConhecida !== undefined && siglaUfConhecida !== record.sgUF) {
      return abort({
        file: input.sourceFile,
        line: lineNumber,
        type: 'uf_conflitante',
        fields: {
          ideCadastro: record.ideCadastro,
          sgUF: record.sgUF,
          siglaUfAnterior: siglaUfConhecida,
        },
        message:
          `Deputado externo ${record.ideCadastro} aparece com estados ` +
          `conflitantes em ${input.sourceFile}: "${siglaUfConhecida}" e ` +
          `"${record.sgUF}".`,
      });
    }

    siglaUfByDeputadoId.set(deputadoId, record.sgUF);
    descricaoByNumSubCota.set(externalNumSubCota, record.txtDescricao);
    coveredThroughMonth = Math.max(coveredThroughMonth ?? month, month);
    totalValorUtilizadoCentavos += valor.centavos;

    const key = `${deputadoId}|${month}|${externalNumSubCota}`;
    const existing = aggregates.get(key);

    aggregates.set(key, {
      deputadoId,
      year: input.year,
      month,
      siglaUf: record.sgUF,
      externalNumSubCota,
      descricao: record.txtDescricao,
      valorUtilizadoCentavos:
        (existing?.valorUtilizadoCentavos ?? 0) + valor.centavos,
    });
  }

  return {
    rows: [...aggregates.values()],
    coveredThroughMonth,
    fatal: null,
    totalValorUtilizadoCentavos,
    categorias: [...descricaoByNumSubCota.entries()].map(
      ([externalNumSubCota, descricao]) => ({ externalNumSubCota, descricao }),
    ),
    read,
    ignored,
    rejected,
    externalGaps: [...externalGapsByExternalId.values()],
  };
}

function toInteger(value: string): number | null {
  return /^-?\d+$/.test(value.trim()) ? Number(value) : null;
}

function rejection(
  input: AggregateDeputadoGastoCotaInput,
  line: number,
  record: CsvRow['record'],
  type: string,
  fields: Record<string, string>,
): Rejection {
  const [field, value] = Object.entries(fields)[0];

  return {
    file: input.sourceFile,
    line,
    type,
    fields: { ideCadastro: record.ideCadastro, ...fields },
    message: `Campo ${field} inválido (${value}) na linha ${line} de ${input.sourceFile}.`,
  };
}
