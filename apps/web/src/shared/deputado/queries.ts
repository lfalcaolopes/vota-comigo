import type {
  DeputadoPerfil,
  DeputadosFeedResponse,
  UfsDisponiveisResponse,
} from "@vota-comigo/shared-types";

import { apiGet } from "@/shared/lib/api-client";

export function feed(
  limit = 20,
  offset = 0,
  q?: string,
  emAtividade?: boolean,
  uf?: string,
): Promise<DeputadosFeedResponse> {
  const qParam = q !== undefined ? `&q=${encodeURIComponent(q)}` : "";
  const atividadeParam =
    emAtividade !== undefined ? `&emAtividade=${emAtividade}` : "";
  const ufParam = uf !== undefined ? `&uf=${encodeURIComponent(uf)}` : "";

  return apiGet<DeputadosFeedResponse>(
    `/deputados/feed?limit=${limit}&offset=${offset}${qParam}${atividadeParam}${ufParam}`,
  );
}

export function ufsDisponiveis(): Promise<UfsDisponiveisResponse> {
  return apiGet<UfsDisponiveisResponse>("/deputados/feed/ufs");
}

export function perfil(externalIdDeputado: number): Promise<DeputadoPerfil> {
  return apiGet<DeputadoPerfil>(`/deputados/${externalIdDeputado}`);
}
