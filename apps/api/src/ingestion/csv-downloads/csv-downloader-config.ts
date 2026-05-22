import type {
  CsvDownloaderConfigResolution,
  CsvDownloaderOptions,
} from './csv-downloader.types';

const firstCsvYear = 2001;

export function resolveCsvDownloaderConfig(
  args: readonly string[],
  options: CsvDownloaderOptions = {},
): CsvDownloaderConfigResolution {
  const currentYear = options.currentYear ?? new Date().getFullYear();
  const yearsValue = getStringArg(args, '--years');
  const lastValue = getStringArg(args, '--last');
  const fromValue = getStringArg(args, '--from');
  const toValue = getStringArg(args, '--to');
  const force = args.includes('--force');

  if (
    lastValue !== undefined &&
    (yearsValue !== undefined ||
      fromValue !== undefined ||
      toValue !== undefined)
  ) {
    return {
      ok: false,
      message:
        '--last não pode ser combinado com --years, --from ou --to. Escolha apenas uma forma de janela temporal.',
    };
  }

  if (yearsValue !== undefined) {
    const years = parseYears(yearsValue);

    if (!years.ok) {
      return years;
    }

    return configResolution(years.value, force, currentYear);
  }

  if (lastValue !== undefined) {
    const last = Number(lastValue);

    if (last !== 5 && last !== 10) {
      return {
        ok: false,
        message: '--last aceita apenas os valores 5 ou 10.',
      };
    }

    return configResolution(
      range(currentYear - last + 1, currentYear),
      force,
      currentYear,
    );
  }

  const from = parseOptionalYear(fromValue, '--from');
  if (!from.ok) {
    return from;
  }

  const to = parseOptionalYear(toValue, '--to');
  if (!to.ok) {
    return to;
  }

  const fromYear = from.value ?? firstCsvYear;
  const toYear = to.value ?? currentYear;

  if (fromYear > toYear) {
    return {
      ok: false,
      message: '--from deve ser menor ou igual a --to.',
    };
  }

  return configResolution(range(fromYear, toYear), force, currentYear);
}

function getStringArg(
  args: readonly string[],
  name: string,
): string | undefined {
  const value = args.find((arg) => arg.startsWith(`${name}=`))?.split('=')[1];

  if (value === undefined) {
    return undefined;
  }

  return value;
}

function configResolution(
  years: readonly number[],
  force: boolean,
  currentYear: number,
): CsvDownloaderConfigResolution {
  const invalidYear = years.find(
    (year) => year < firstCsvYear || year > currentYear,
  );

  if (invalidYear !== undefined) {
    return {
      ok: false,
      message: `Ano ${invalidYear} inválido. Use anos entre ${firstCsvYear} e ${currentYear}.`,
    };
  }

  return {
    ok: true,
    config: {
      force,
      years,
    },
  };
}

function parseYears(
  value: string,
): { ok: true; value: readonly number[] } | { ok: false; message: string } {
  const years = value.split(',');

  if (years.some((year) => !isYearValue(year))) {
    return {
      ok: false,
      message:
        '--years deve receber anos no formato YYYY separados por vírgula.',
    };
  }

  return {
    ok: true,
    value: years.map(Number),
  };
}

function parseOptionalYear(
  value: string | undefined,
  name: string,
): { ok: true; value: number | undefined } | { ok: false; message: string } {
  if (value === undefined) {
    return {
      ok: true,
      value: undefined,
    };
  }

  if (!isYearValue(value)) {
    return {
      ok: false,
      message: `${name} deve receber um ano no formato YYYY.`,
    };
  }

  return {
    ok: true,
    value: Number(value),
  };
}

function isYearValue(value: string): boolean {
  return /^\d{4}$/.test(value);
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}
