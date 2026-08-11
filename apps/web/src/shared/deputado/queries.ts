import type {
  DeputadoDiscursosResponse,
  DeputadoPerfil,
  DeputadoOrgaosResponse,
  DeputadoProposicoesAssinadasResponse,
  DeputadosFeedResponse,
  PartidosDisponiveisResponse,
  UfsDisponiveisResponse,
} from "@vota-comigo/shared-types";

import { apiGet } from "@/shared/lib/api-client";

export function feed(
  limit = 20,
  offset = 0,
  q?: string,
  emAtividade?: boolean,
  uf?: string,
  partido?: string,
): Promise<DeputadosFeedResponse> {
  const qParam = q !== undefined ? `&q=${encodeURIComponent(q)}` : "";
  const atividadeParam =
    emAtividade !== undefined ? `&emAtividade=${emAtividade}` : "";
  const ufParam = uf !== undefined ? `&uf=${encodeURIComponent(uf)}` : "";
  const partidoParam =
    partido !== undefined ? `&partido=${encodeURIComponent(partido)}` : "";

  return apiGet<DeputadosFeedResponse>(
    `/deputados/feed?limit=${limit}&offset=${offset}${qParam}${atividadeParam}${ufParam}${partidoParam}`,
  );
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
