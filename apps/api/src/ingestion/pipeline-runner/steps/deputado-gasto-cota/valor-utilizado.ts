export type ValorUtilizadoRecord = {
  vlrLiquido: string;
  vlrRestituicao: string;
};

export type ValorUtilizadoResult =
  | { ok: true; centavos: number }
  | { ok: false; field: 'vlrLiquido' | 'vlrRestituicao'; value: string };

const valorPattern = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

export function deriveValorUtilizadoCentavos(
  record: ValorUtilizadoRecord,
): ValorUtilizadoResult {
  const liquido = toCentavos(record.vlrLiquido);

  if (liquido === null) {
    return { ok: false, field: 'vlrLiquido', value: record.vlrLiquido };
  }

  const restituicao =
    record.vlrRestituicao === '' ? 0 : toCentavos(record.vlrRestituicao);

  if (restituicao === null) {
    return { ok: false, field: 'vlrRestituicao', value: record.vlrRestituicao };
  }

  return { ok: true, centavos: liquido - restituicao };
}

function toCentavos(value: string): number | null {
  const match = valorPattern.exec(value.trim());

  if (match === null) {
    return null;
  }

  const [, sinal, inteiro, decimais = ''] = match;
  const centavos =
    Number(inteiro) * 100 + Number(decimais.padEnd(2, '0').slice(0, 2));

  return sinal === '-' ? -centavos : centavos;
}
