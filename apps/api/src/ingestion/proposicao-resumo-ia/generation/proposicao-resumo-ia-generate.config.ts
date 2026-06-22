export type ProposicaoResumoIaGenerateConfig = {
  year?: number;
  limit?: number;
  externalIdProposicao?: number;
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

  const year = parseYear(getStringArg(args, '--year'));
  if (!year.ok) return year;

  const limit = parsePositiveInt(getStringArg(args, '--limit'), '--limit');
  if (!limit.ok) return limit;

  const externalIdProposicao = parsePositiveInt(
    getStringArg(args, '--external-id-proposicao'),
    '--external-id-proposicao',
  );
  if (!externalIdProposicao.ok) return externalIdProposicao;

  return {
    ok: true,
    config: {
      year: year.value,
      limit: limit.value,
      externalIdProposicao: externalIdProposicao.value,
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

function parseYear(
  value: string | undefined,
): { ok: true; value: number | undefined } | { ok: false; message: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (!/^\d{4}$/.test(value)) {
    return {
      ok: false,
      message: '--year deve receber um ano no formato YYYY.',
    };
  }
  return { ok: true, value: Number(value) };
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
