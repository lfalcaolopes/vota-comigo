import type {
  DeputadoPerfil,
  DeputadoPeriodoPartidario,
} from "@vota-comigo/shared-types";

import type { BadgeTone } from "@/shared/ui";

export const CARGO_DEPUTADO = "Deputado federal";

export const RECORTE_BASE_PRESENCA =
  "votações nominais de plenário presentes na base";

export const HISTORICO_PARTIDARIO_INDISPONIVEL =
  "Não há histórico partidário na base para este deputado.";

const ESTADO_LABEL_BY_SIGLA_UF: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

const mesAnoFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
});

function formatMesAno(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const parts = mesAnoFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value.replace(".", "") ?? "";

  return `${value("month")}/${value("year")}`;
}

export function toPeriodoPartidarioLabel(
  periodo: DeputadoPeriodoPartidario,
): string {
  const inicio = formatMesAno(periodo.dataInicio);

  if (periodo.atual) return `${inicio} – atual`;
  if (periodo.dataFim !== null) return `${inicio} – ${formatMesAno(periodo.dataFim)}`;

  return inicio;
}

export function nomePublicoLabel(perfil: DeputadoPerfil): string {
  return perfil.nomePublico ?? CARGO_DEPUTADO;
}

export function toAtividadeLabel(emAtividade: boolean): string {
  return emAtividade ? "Em atividade" : "Mandato encerrado";
}

export function toAtividadeTone(emAtividade: boolean): BadgeTone {
  return emAtividade ? "success" : "neutral";
}

export function toAtividadeAriaLabel(emAtividade: boolean): string {
  return `Situação do mandato: ${toAtividadeLabel(emAtividade)}`;
}

export function toEstadoLabel(siglaUf: string): string {
  return ESTADO_LABEL_BY_SIGLA_UF[siglaUf] ?? siglaUf;
}

export function formatPercentual(value: number): string {
  return `${Math.round(value)}%`;
}

export function toPresencaAmostrasLabel(
  presencas: number,
  total: number,
): string {
  return `${presencas} de ${total} votações em exercício`;
}

export function toPresencaAriaLabel(
  percentual: number,
  presencas: number,
  total: number,
): string {
  return `Presença: ${formatPercentual(percentual)} — ${toPresencaAmostrasLabel(presencas, total)}`;
}

export function toRedeSocialLinkLabel(url: string): string {
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    host = url;
  }

  return `Abrir ${host} em nova aba`;
}

const PARTICLES = new Set(["de", "da", "do", "dos", "das", "e"]);

export function getInitials(nome: string | null): string {
  if (!nome) return "?";

  const words = nome.trim().split(/\s+/).filter((w) => w.length > 0);
  const meaningful = words.filter((w) => !PARTICLES.has(w.toLowerCase()));

  if (meaningful.length === 0) return "?";

  if (meaningful.length === 1) {
    return meaningful[0].charAt(0).toUpperCase();
  }

  const first = meaningful[0].charAt(0).toUpperCase();
  const last = meaningful[meaningful.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
}
