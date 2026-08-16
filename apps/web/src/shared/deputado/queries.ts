import type {
  ComparativoDeputadosResponse,
  DeputadoCeapResponse,
  DeputadoDiscursosResponse,
  DeputadoPerfil,
  DeputadoOrgaosResponse,
  DeputadoProposicoesAssinadasResponse,
  DeputadosFeedResponse,
  PartidosDisponiveisResponse,
  UfsDisponiveisResponse,
} from "@vota-comigo/shared-types";

import { apiGet } from "@/shared/lib/api-client";

import { FILTROS_PADRAO, type DeputadoFeedFiltros } from "./feed-filtros";
import { buildDeputadosFeedSearchParams } from "./feed-url";

// Os filtros viram query string pelo mesmo construtor que monta o endereço da
// página, então requisição e URL não podem divergir.
export function feed(
  limit = 20,
  offset = 0,
  query: string | null = null,
  filtros: DeputadoFeedFiltros = FILTROS_PADRAO,
): Promise<DeputadosFeedResponse> {
  const params = buildDeputadosFeedSearchParams({ ...filtros, query });
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return apiGet<DeputadosFeedResponse>(`/deputados/feed?${params.toString()}`);
}

export function ufsDisponiveis(): Promise<UfsDisponiveisResponse> {
  return apiGet<UfsDisponiveisResponse>("/deputados/feed/ufs");
}

export function partidosDisponiveis(): Promise<PartidosDisponiveisResponse> {
  return apiGet<PartidosDisponiveisResponse>("/deputados/feed/partidos");
}

export function perfil(externalIdDeputado: number): Promise<DeputadoPerfil> {
  return apiGet<DeputadoPerfil>(`/deputados/${externalIdDeputado}`);
}

export function ceap(
  externalIdDeputado: number,
  year: number,
): Promise<DeputadoCeapResponse> {
  return apiGet<DeputadoCeapResponse>(
    `/deputados/${externalIdDeputado}/ceap?year=${year}`,
  );
}

export function orgaos(
  externalIdDeputado: number,
  year: number,
): Promise<DeputadoOrgaosResponse> {
  return apiGet<DeputadoOrgaosResponse>(
    `/deputados/${externalIdDeputado}/orgaos?year=${year}`,
  );
}

export function proposicoesAssinadas(
  externalIdDeputado: number,
  year: number,
): Promise<DeputadoProposicoesAssinadasResponse> {
  return apiGet<DeputadoProposicoesAssinadasResponse>(
    `/deputados/${externalIdDeputado}/proposicoes-assinadas?year=${year}`,
  );
}

export function discursos(
  externalIdDeputado: number,
  year: number,
): Promise<DeputadoDiscursosResponse> {
  return apiGet<DeputadoDiscursosResponse>(
    `/deputados/${externalIdDeputado}/discursos?year=${year}`,
  );
}

export function comparativoDeputados(
  externalIdsDeputado: readonly number[],
): Promise<ComparativoDeputadosResponse> {
  return apiGet<ComparativoDeputadosResponse>(
    `/comparativo-deputados?ids=${externalIdsDeputado.join(",")}`,
  );
}
