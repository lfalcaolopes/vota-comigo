import type { MaisVotadasResponse } from "@vota-comigo/shared-types";

import { apiGet } from "@/shared/lib/api-client";

export function maisVotadas(
  limit = 20,
  offset = 0,
): Promise<MaisVotadasResponse> {
  return apiGet<MaisVotadasResponse>(
    `/proposicoes/mais-votadas?limit=${limit}&offset=${offset}`,
  );
}
