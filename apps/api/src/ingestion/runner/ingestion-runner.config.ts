import type {
  IngestionRunnerConfigOptions,
  IngestionRunnerConfigResolution,
} from './ingestion-runner.types';

const firstCsvYear = 2001;

export function resolveIngestionRunnerConfig(
  args: readonly string[],
  options: IngestionRunnerConfigOptions = {},
): IngestionRunnerConfigResolution {
  const currentYear = options.currentYear ?? new Date().getFullYear();
  const dryRun = args.includes('--dry-run');
  const strict = args.includes('--strict');
  const debug = args.includes('--debug');
  const only = parseOnly(args);

  const limit = parseLimit(getStringArg(args, '--limit'));
  if (!limit.ok) {
    return limit;
  }

  if (only !== undefined && options.stepNames !== undefined) {
    const unknown = only.filter((step) => !options.stepNames!.includes(step));

    if (unknown.length > 0) {
      return {
        ok: false,
        message: `--only recebeu passos desconhecidos: ${unknown.join(', ')}. Passos válidos: ${options.stepNames.join(', ')}.`,
      };
    }
  }

  const from = parseOptionalYear(getStringArg(args, '--from'), '--from');
  if (!from.ok) {
    return from;
  }

  const to = parseOptionalYear(getStringArg(args, '--to'), '--to');
  if (!to.ok) {
    return to;
  }

  const fromYear = from.value ?? firstCsvYear;
  const toYear = to.value ?? currentYear;

  const outOfRange = [fromYear, toYear].find(
    (year) => year < firstCsvYear || year > currentYear,
  );

  if (outOfRange !== undefined) {
    return {
      ok: false,
      message: `Ano ${outOfRange} inválido. Use anos entre ${firstCsvYear} e ${currentYear}.`,
    };
  }

  if (fromYear > toYear) {
    return {
      ok: false,
      message: '--from deve ser menor ou igual a --to.',
    };
  }

  return {
    ok: true,
    config: {
      only,
      years: range(fromYear, toYear),
      dryRun,
      strict,
      debug,
      limit: limit.value,
    },
  };
}

function parseLimit(
  value: string | undefined,
): { ok: true; value: number | undefined } | { ok: false; message: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!/^\d+$/.test(value) || Number(value) < 1) {
    return {
      ok: false,
      message: '--limit deve receber um inteiro positivo.',
    };
  }

  return { ok: true, value: Number(value) };
}

function parseOnly(args: readonly string[]): readonly string[] | undefined {
  const value = getStringArg(args, '--only');

  if (value === undefined) {
    return undefined;
  }

  return value.split(',');
}

function getStringArg(
  args: readonly string[],
  name: string,
): string | undefined {
  return args.find((arg) => arg.startsWith(`${name}=`))?.split('=')[1];
}

function parseOptionalYear(
  value: string | undefined,
  name: string,
): { ok: true; value: number | undefined } | { ok: false; message: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!/^\d{4}$/.test(value)) {
    return {
      ok: false,
      message: `${name} deve receber um ano no formato YYYY.`,
    };
  }

  return { ok: true, value: Number(value) };
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}
