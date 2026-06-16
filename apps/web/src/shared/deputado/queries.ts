import type { DeputadoPerfil } from "@vota-comigo/shared-types";

import { apiGet } from "@/shared/lib/api-client";

export function perfil(externalIdDeputado: number): Promise<DeputadoPerfil> {
  return apiGet<DeputadoPerfil>(`/deputados/${externalIdDeputado}`);
}
