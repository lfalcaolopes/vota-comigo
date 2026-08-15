import { CATEGORIA_PASSAGEM_AEREA_SIGEPA } from '@/shared/cota/categorias-passagem-aerea';

import type { Rejection } from '../../types/ingestion-pipeline-runner.types';
import type {
  DespesaCota,
  GastoCotaSigepaJson,
} from './deputado-gasto-cota-sigepa.repository.types';

// A API de despesas não publica o código da categoria, só a descrição. A
// categoria continua sendo a constante 998: o texto serve para reconhecer a
// linha, e qualquer grafia diferente da conhecida aborta o ano em vez de
// virar categoria nova (ADR 022).
export const DESCRICAO_PASSAGEM_AEREA_SIGEPA = 'PASSAGEM AÉREA - SIGEPA';

const TOKEN_SIGEPA = 'SIGEPA';

export type DespesaSigepaConversion =
  | { kind: 'gasto'; month: number; valorCentavos: number }
  | { kind: 'ignored' }
  | { kind: 'rejected'; type: string; field: string; value: string }
  | { kind: 'conflito'; tipoDespesa: string };

export function toGastoSigepa(
  despesa: DespesaCota,
  year: number,
): DespesaSigepaConversion {
  const tipoDespesa = despesa.tipoDespesa?.trim() ?? '';

  if (!tipoDespesa.toUpperCase().includes(TOKEN_SIGEPA)) {
    return { kind: 'ignored' };
  }

  if (tipoDespesa !== DESCRICAO_PASSAGEM_AEREA_SIGEPA) {
    return { kind: 'conflito', tipoDespesa };
  }

  if (despesa.ano !== year) {
    return {
      kind: 'rejected',
      type: 'ano_divergente',
      field: 'ano',
      value: String(despesa.ano ?? ''),
    };
  }

  const month = despesa.mes;

  if (month === null || !Number.isInteger(month) || month < 1 || month > 12) {
    return {
      kind: 'rejected',
      type: 'mes_invalido',
      field: 'mes',
      value: String(despesa.mes ?? ''),
    };
  }

  const valorLiquido = despesa.valorLiquido;

  if (valorLiquido === null || !Number.isFinite(valorLiquido)) {
    return {
      kind: 'rejected',
      type: 'valor_invalido',
      field: 'valorLiquido',
      value: String(despesa.valorLiquido ?? ''),
    };
  }

  // valorLiquido puro: valorGlosa já vem descontado dele e o endpoint não
  // publica restituição, então o estorno negativo é o valor, não um erro.
  return {
    kind: 'gasto',
    month,
    valorCentavos: Math.round(valorLiquido * 100),
  };
}

export type AggregateGastosSigepaInput = {
  despesas: readonly DespesaCota[];
  year: number;
  externalIdDeputado: number;
  sourceFile: string;
};

export type AggregateGastosSigepaResult = {
  gastosJson: GastoCotaSigepaJson;
  // Preenchido quando a descrição da categoria diverge: o ano inteiro do
  // deputado é abortado, nunca gravado pela metade.
  fatal: Rejection | null;
  read: number;
  ignored: number;
  rejected: readonly Rejection[];
};

export function aggregateGastosSigepa(
  input: AggregateGastosSigepaInput,
): AggregateGastosSigepaResult {
  const centavosByMonth = new Map<number, number>();
  const rejected: Rejection[] = [];
  let ignored = 0;

  for (const despesa of input.despesas) {
    const conversion = toGastoSigepa(despesa, input.year);

    if (conversion.kind === 'ignored') {
      ignored += 1;
      continue;
    }

    if (conversion.kind === 'conflito') {
      return {
        gastosJson: {},
        fatal: conflito(input, conversion.tipoDespesa),
        read: input.despesas.length,
        ignored,
        rejected,
      };
    }

    if (conversion.kind === 'rejected') {
      rejected.push(rejection(input, despesa, conversion));
      continue;
    }

    centavosByMonth.set(
      conversion.month,
      (centavosByMonth.get(conversion.month) ?? 0) + conversion.valorCentavos,
    );
  }

  return {
    gastosJson: Object.fromEntries(
      [...centavosByMonth.entries()]
        .sort(([a], [b]) => a - b)
        .map(([month, centavos]) => [String(month), centavos]),
    ),
    fatal: null,
    read: input.despesas.length,
    ignored,
    rejected,
  };
}

function conflito(
  input: AggregateGastosSigepaInput,
  tipoDespesa: string,
): Rejection {
  return {
    file: input.sourceFile,
    line: 0,
    type: 'descricao_conflitante',
    fields: {
      externalIdDeputado: String(input.externalIdDeputado),
      ano: String(input.year),
      externalNumSubCota: String(CATEGORIA_PASSAGEM_AEREA_SIGEPA),
      tipoDespesa,
      descricaoConhecida: DESCRICAO_PASSAGEM_AEREA_SIGEPA,
    },
    message:
      `Categoria ${CATEGORIA_PASSAGEM_AEREA_SIGEPA} veio como ` +
      `"${tipoDespesa}" na API para o deputado ${input.externalIdDeputado} ` +
      `em ${input.year}, e não como "${DESCRICAO_PASSAGEM_AEREA_SIGEPA}".`,
  };
}

function rejection(
  input: AggregateGastosSigepaInput,
  despesa: DespesaCota,
  conversion: { type: string; field: string; value: string },
): Rejection {
  return {
    file: input.sourceFile,
    line: 0,
    type: conversion.type,
    fields: {
      externalIdDeputado: String(input.externalIdDeputado),
      ano: String(despesa.ano ?? ''),
      mes: String(despesa.mes ?? ''),
      [conversion.field]: conversion.value,
    },
    message:
      `Campo ${conversion.field} inválido (${conversion.value}) na despesa ` +
      `de passagem aérea SIGEPA do deputado ${input.externalIdDeputado} ` +
      `em ${input.year}.`,
  };
}
