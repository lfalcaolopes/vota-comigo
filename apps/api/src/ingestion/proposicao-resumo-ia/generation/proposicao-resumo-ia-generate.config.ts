export type ProposicaoResumoIaGenerateConfig = {
  years?: readonly number[];
  limit?: number;
  externalIdsProposicao?: readonly number[];
  regenerate: boolean;
  onlyStale: boolean;
};

export type ProposicaoResumoIaGenerateConfigResolution =
  | { ok: true; config: ProposicaoResumoIaGenerateConfig }
  | { ok: false; message: string };

export function resolveProposicaoResumoIaGenerateConfig(
  args: readonly string[],
): ProposicaoResumoIaGenerateConfigResolution {
  const regenerate = args.includes('--regenerate');
  const onlyStale = args.includes('--only-stale');

  if (regenerate && onlyStale) {
    return {
      ok: false,
      message: '--only-stale e --regenerate não podem ser usados juntos.',
    };
  }

  const years = parseYearList(getStringArg(args, '--year'));
  if (!years.ok) return years;

  const limit = parsePositiveInt(getStringArg(args, '--limit'), '--limit');
  if (!limit.ok) return limit;

  const externalIdsProposicao = parsePositiveIntList(
    getStringArg(args, '--external-id-proposicao'),
    '--external-id-proposicao',
  );
  if (!externalIdsProposicao.ok) return externalIdsProposicao;

  return {
    ok: true,
    config: {
      years: years.value,
      limit: limit.value,
      externalIdsProposicao: externalIdsProposicao.value,
      regenerate,
      onlyStale,
    },
  };
}

function getStringArg(
  args: readonly string[],
  name: string,
): string | undefined {
  return args.find((arg) => arg.startsWith(`${name}=`))?.split('=')[1];
}

function parseYearList(value: string | undefined): NumberListResolution {
  return parseNumberList(
    value,
    (part) => /^\d{4}$/.test(part),
    '--year deve receber um ou mais anos no formato YYYY separados por vírgula.',
  );
}

function parsePositiveInt(
  value: string | undefined,
  flag: string,
): { ok: true; value: number | undefined } | { ok: false; message: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    return { ok: false, message: `${flag} deve receber um inteiro positivo.` };
  }
  return { ok: true, value: Number(value) };
}

function parsePositiveIntList(
  value: string | undefined,
  flag: string,
): NumberListResolution {
  return parseNumberList(
    value,
    (part) => /^\d+$/.test(part) && Number(part) >= 1,
    `${flag} deve receber um ou mais inteiros positivos separados por vírgula.`,
  );
}

type NumberListResolution =
  | { ok: true; value: readonly number[] | undefined }
  | { ok: false; message: string };

function parseNumberList(
  value: string | undefined,
  isValidPart: (part: string) => boolean,
  message: string,
): NumberListResolution {
  if (value === undefined) return { ok: true, value: undefined };

  const parts = value.split(',').map((part) => part.trim());
  const parsed: number[] = [];
  for (const part of parts) {
    if (!isValidPart(part)) return { ok: false, message };
    parsed.push(Number(part));
  }
  return { ok: true, value: parsed };
}
