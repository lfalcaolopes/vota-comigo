import type { ProposicaoCard } from "@vota-comigo/shared-types";

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
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
  if (!iso) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  const parts = shortDateFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value.replace(".", "") ?? "";

  return `${value("day")} ${value("month")} ${value("year")}`;
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
