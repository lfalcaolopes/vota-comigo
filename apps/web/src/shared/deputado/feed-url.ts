import {
  deputadoFaixaEtariaSchema,
  deputadoFeedSortSchema,
  deputadoSexoSchema,
  type DeputadoFaixaEtaria,
  type DeputadoSexo,
  type DeputadoFeedSort,
} from "@vota-comigo/shared-types";

import { FILTROS_PADRAO, type DeputadoFeedFiltros } from "./feed-filtros";

type SearchParamValue = string | string[] | undefined;

export type DeputadosFeedSearchParams = {
  q?: string;
  incluirForaDeExercicio?: string;
  uf?: SearchParamValue;
  partido?: SearchParamValue;
  sexo?: string;
  faixaEtaria?: SearchParamValue;
  sort?: string;
};

export type DeputadosFeedUrlState = DeputadoFeedFiltros & {
  query: string | null;
};

export function parseDeputadosFeedUrlState(
  params: DeputadosFeedSearchParams,
): DeputadosFeedUrlState {
  return {
    query: parseQueryParam(params.q),
    sort: parseSortParam(params.sort),
    incluirForaDeExercicio: params.incluirForaDeExercicio === "true",
    ufs: parseLista(params.uf, parseUfParam),
    partidos: parseLista(params.partido, parsePartidoParam),
    sexo: parseSexoParam(params.sexo),
    faixasEtarias: parseLista(params.faixaEtaria, parseFaixaEtariaParam),
  };
}

export function buildDeputadosFeedSearchParams({
  query,
  incluirForaDeExercicio,
  ufs,
  partidos,
  sexo,
  faixasEtarias,
  sort,
}: DeputadosFeedUrlState): URLSearchParams {
  const params = new URLSearchParams();
  const term = parseQueryParam(query ?? undefined);

  if (term !== null) params.set("q", term);
  if (sort !== undefined && sort !== FILTROS_PADRAO.sort)
    params.set("sort", sort);
  if (incluirForaDeExercicio) params.set("incluirForaDeExercicio", "true");
  for (const uf of ufs) params.append("uf", uf);
  for (const partido of partidos) params.append("partido", partido);
  if (sexo !== null) params.set("sexo", sexo);
  for (const faixa of faixasEtarias) params.append("faixaEtaria", faixa);

  return params;
}

export function buildDeputadosFeedHref(
  pathname: string,
  state: DeputadosFeedUrlState,
): string {
  const params = buildDeputadosFeedSearchParams(state);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

// Um endereço editado à mão não derruba a página: o valor ilegível some e os
// demais continuam valendo.
function parseLista<Valor extends string>(
  raw: SearchParamValue,
  parseValor: (value: string) => Valor | null,
): readonly Valor[] {
  if (raw === undefined) return [];

  const valores = (Array.isArray(raw) ? raw : [raw]).flatMap((value) => {
    const parsed = parseValor(value);
    return parsed === null ? [] : [parsed];
  });

  return [...new Set(valores)];
}

function parseQueryParam(raw: string | undefined): string | null {
  const term = raw?.trim();
  if (!term || !/[\p{L}\p{N}]/u.test(term)) return null;
  return term;
}

function parseUfParam(raw: string): string | null {
  const uf = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(uf) ? uf : null;
}

function parsePartidoParam(raw: string): string | null {
  const partido = raw.trim();
  return /^[\p{L}\p{N}.*]{1,24}$/u.test(partido) ? partido : null;
}

function parseSexoParam(raw: string | undefined): DeputadoSexo | null {
  if (raw === undefined) return FILTROS_PADRAO.sexo;
  const parsed = deputadoSexoSchema.safeParse(raw.trim().toUpperCase());
  return parsed.success ? parsed.data : FILTROS_PADRAO.sexo;
}

function parseFaixaEtariaParam(raw: string): DeputadoFaixaEtaria | null {
  const parsed = deputadoFaixaEtariaSchema.safeParse(raw.trim());
  return parsed.success ? parsed.data : null;
}

function parseSortParam(raw: string | undefined): DeputadoFeedSort {
  const parsed = deputadoFeedSortSchema.safeParse(raw);
  return parsed.success ? parsed.data : "nome";
}
