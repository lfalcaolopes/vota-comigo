import type { ProposicaoCard } from "@vota-comigo/shared-types";

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("pt-BR", {
  numeric: "always",
});

// Identificador legislativo: "SIGLA NUMERO/ANO". Degrades by dropping whatever
// is missing rather than guessing; with nothing present there is no id at all.
export function toIdentificadorLegislativo(
  card: Pick<ProposicaoCard, "siglaTipo" | "numero" | "ano">,
): string | null {
  const { siglaTipo, numero, ano } = card;

  const numberPart =
    numero != null && ano != null
      ? `${numero}/${ano}`
      : numero != null
        ? `${numero}`
        : ano != null
          ? `${ano}`
          : "";

  const parts = [siglaTipo ?? "", numberPart].filter((part) => part !== "");

  return parts.length > 0 ? parts.join(" ") : null;
}

// Parses the date-only portion in local time so formatting never drifts a day.
export function formatShortDate(iso: string | null): string | null {
  const date = parseLocalIsoDate(iso);
  if (date === null) return null;

  const parts = shortDateFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value.replace(".", "") ?? "";

  return `${value("day")} ${value("month")} ${value("year")}`;
}

export function formatRelativeDate(
  iso: string | null,
  referenceDate = new Date(),
): string | null {
  const date = parseLocalIsoDate(iso);
  if (date === null) return null;

  const diffDays = wholeDaysBetween(date, referenceDate);
  const absDays = Math.abs(diffDays);

  if (absDays < 30) {
    return relativeTimeFormatter.format(diffDays, "day");
  }

  if (absDays < 365) {
    return relativeTimeFormatter.format(Math.round(diffDays / 30), "month");
  }

  return relativeTimeFormatter.format(Math.round(diffDays / 365), "year");
}

export function formatDateWithRelativeTime(
  iso: string | null,
  referenceDate = new Date(),
): string | null {
  const shortDate = formatShortDate(iso);
  const relativeDate = formatRelativeDate(iso, referenceDate);

  if (shortDate === null) return null;
  if (relativeDate === null) return shortDate;

  return `${shortDate} (${relativeDate})`;
}

export function maxIsoDate(values: readonly (string | null)[]): string | null {
  return values.reduce<string | null>((max, value) => {
    if (value === null) {
      return max;
    }
    return max === null || value > max ? value : max;
  }, null);
}

export function toTextoResumo(
  card: Pick<ProposicaoCard, "resumoIaDisponivel" | "resumoIaCard" | "ementa">,
): string | null {
  return card.resumoIaDisponivel && card.resumoIaCard
    ? card.resumoIaCard
    : card.ementa;
}

export function toAnoApresentacao(
  card: Pick<ProposicaoCard, "dataApresentacao" | "ano">,
): number | null {
  const yearMatch = card.dataApresentacao
    ? /^(\d{4})/.exec(card.dataApresentacao)
    : null;

  if (yearMatch) {
    return Number(yearMatch[1]);
  }

  return card.ano ?? null;
}

function parseLocalIsoDate(iso: string | null): Date | null {
  if (!iso) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function wholeDaysBetween(date: Date, referenceDate: Date): number {
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const referenceUtc = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );

  return Math.round((dateUtc - referenceUtc) / 86_400_000);
}
