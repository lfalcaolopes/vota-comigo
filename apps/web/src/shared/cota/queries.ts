import type { CotaLegislaturaResponse } from "@vota-comigo/shared-types";

import { apiGet } from "@/shared/lib/api-client";

export function cotaLegislatura(): Promise<CotaLegislaturaResponse> {
  return apiGet<CotaLegislaturaResponse>("/cota/legislatura");
}
