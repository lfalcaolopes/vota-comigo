import { SITE_NAME, siteUrl } from "@/shared/lib/site";

import { formatData, formatPercentual, nomePublicoLabel } from "./presentation";

const TITULO = `${SITE_NAME} — deputados de interesse`;

export type DeputadoTextItem = {
  externalIdDeputado: number;
  nome: string | null;
  siglaPartido: string | null;
  siglaUf: string | null;
  compatibilidade: number | null;
};

export type BuildDeputadosTextInput = {
  deputados: readonly DeputadoTextItem[];
  contexto: string | null;
  salvoEm: Date;
};

export function buildDeputadosText({
  deputados,
  contexto,
  salvoEm,
}: BuildDeputadosTextInput): string {
  return [toCabecalho(contexto, salvoEm), ...deputados.map(toEntrada)].join(
    "\n\n",
  );
}

function toCabecalho(contexto: string | null, salvoEm: Date): string {
  const data = `Salvo em ${formatData(toIsoDate(salvoEm))}`;
  return `${TITULO}\n${contexto === null ? data : `${data} · ${contexto}`}`;
}

function toEntrada(deputado: DeputadoTextItem): string {
  const nome = nomePublicoLabel({ nomePublico: deputado.nome });
  const href = `${siteUrl}/deputados/${deputado.externalIdDeputado}`;

  return `- ${nome}${toIdentificacao(deputado)}${toMetrica(deputado)}\n  ${href}`;
}

function toIdentificacao(deputado: DeputadoTextItem): string {
  const siglas = [deputado.siglaPartido, deputado.siglaUf].filter(
    (sigla): sigla is string => sigla !== null,
  );
  if (siglas.length === 0) return "";

  return ` (${siglas.join("-")})`;
}

function toMetrica(deputado: DeputadoTextItem): string {
  if (deputado.compatibilidade === null) return "";

  return ` — ${formatPercentual(deputado.compatibilidade)} de concordância`;
}

// formatData reads a calendar date out of an ISO prefix, and toISOString would
// shift the day near midnight; the stamp has to be the user's local date.
function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}
